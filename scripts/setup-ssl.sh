#!/bin/bash
# Al Fakhir School LMS - SSL Certificate Setup Script (Certbot + Nginx)
# Usage: bash scripts/setup-ssl.sh [install|renew|status|test]

set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers & logging
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ts()    { date '+%Y-%m-%d %H:%M:%S'; }
log()   { echo -e "${GREEN}[$(ts)] $1${NC}"; }
warn()  { echo -e "${YELLOW}[$(ts)] WARN: $1${NC}"; }
error() { echo -e "${RED}[$(ts)] ERROR: $1${NC}" >&2; exit 1; }
info()  { echo -e "${CYAN}[$(ts)] $1${NC}"; }
step()  { echo -e "${BOLD}${CYAN}[$(ts)] ==> $1${NC}"; }
hr()    { echo -e "${CYAN}$(printf '─%.0s' {1..70})${NC}"; }

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ACTION="${1:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/alfakhir-school}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
NGINX_CONTAINER="alfakhir_nginx"

# Domains to manage
DOMAINS=(
  "api.alfakhirschool.id"
  "n8n.alfakhirschool.id"
  "minio.alfakhirschool.id"
)
ADMIN_EMAIL="${LE_EMAIL:-admin@alfakhirschool.id}"

# Certbot webroot (must match nginx config)
WEBROOT="${WEBROOT:-/var/www/certbot}"
CERTS_DIR="${CERTS_DIR:-/etc/letsencrypt/live}"

# ---------------------------------------------------------------------------
# docker compose helper
# ---------------------------------------------------------------------------
compose_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE}" "$@"
  else
    docker-compose -f "${COMPOSE_FILE}" "$@"
  fi
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  echo -e "${BOLD}Usage:${NC}  bash setup-ssl.sh [install|renew|status|test]"
  echo ""
  echo "  install  - Obtain certificates with certbot --nginx for all domains"
  echo "  renew    - Renew expiring certificates and reload nginx"
  echo "  status   - Show certificate expiry dates"
  echo "  test     - Dry-run certbot (no actual certificates issued)"
  echo ""
  echo "Domains managed:"
  for d in "${DOMAINS[@]}"; do echo "  - $d"; done
  echo ""
  echo "Environment variables:"
  echo "  LE_EMAIL   - Let's Encrypt account email (default: ${ADMIN_EMAIL})"
  echo "  WEBROOT    - Webroot for ACME challenge   (default: ${WEBROOT})"
  exit 1
}

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------
check_prerequisites() {
  step "Checking prerequisites..."

  # certbot
  if ! command -v certbot &>/dev/null; then
    error "certbot is not installed. Install with: sudo apt install certbot python3-certbot-nginx"
  fi
  log "certbot found: $(certbot --version 2>&1 | head -1)"

  # nginx container
  if ! docker inspect "${NGINX_CONTAINER}" &>/dev/null; then
    warn "Nginx container '${NGINX_CONTAINER}' not found. Make sure nginx is running."
  fi
}

# ---------------------------------------------------------------------------
# DNS pre-check: verify domain resolves to this server's IP
# ---------------------------------------------------------------------------
check_dns() {
  local domain="$1"
  local server_ip

  # Try to detect public IP
  server_ip=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null \
    || curl -s --max-time 5 https://ifconfig.me 2>/dev/null \
    || hostname -I | awk '{print $1}' 2>/dev/null \
    || echo "unknown")

  local resolved_ip
  resolved_ip=$(dig +short "${domain}" A 2>/dev/null | head -1 || \
                getent hosts "${domain}" 2>/dev/null | awk '{print $1}' | head -1 || \
                echo "")

  if [[ -z "$resolved_ip" ]]; then
    warn "DNS check: ${domain} does not resolve. Let's Encrypt will likely fail."
    return 1
  fi

  if [[ "$resolved_ip" == "$server_ip" ]]; then
    log "DNS check OK: ${domain} -> ${resolved_ip} (matches server IP)"
    return 0
  else
    warn "DNS mismatch: ${domain} resolves to ${resolved_ip}, server IP is ${server_ip}"
    warn "Let's Encrypt may fail if the domain doesn't point to this server."
    return 0  # non-fatal, user may have CDN/proxy
  fi
}

# ---------------------------------------------------------------------------
# Check if cert exists and warn about rate limits
# ---------------------------------------------------------------------------
check_existing_cert() {
  local domain="$1"
  if [[ -d "${CERTS_DIR}/${domain}" ]]; then
    local expiry
    expiry=$(openssl x509 -noout -enddate \
      -in "${CERTS_DIR}/${domain}/fullchain.pem" 2>/dev/null \
      | cut -d= -f2 || echo "unknown")
    warn "Certificate already exists for ${domain} (expires: ${expiry})"
    warn "Re-issuing too many times may hit Let's Encrypt rate limits (5/domain/week)."
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Reload nginx container
# ---------------------------------------------------------------------------
reload_nginx() {
  step "Reloading nginx configuration..."
  if docker inspect "${NGINX_CONTAINER}" &>/dev/null; then
    docker exec "${NGINX_CONTAINER}" nginx -s reload \
      && log "Nginx reloaded successfully." \
      || warn "Nginx reload failed. Try: docker restart ${NGINX_CONTAINER}"
  else
    warn "Nginx container '${NGINX_CONTAINER}' not found. Reload skipped."
  fi
}

# ---------------------------------------------------------------------------
# Setup auto-renewal cron
# ---------------------------------------------------------------------------
setup_cron() {
  step "Setting up auto-renewal cron job..."
  local cron_job="0 3 * * * certbot renew --quiet --post-hook 'docker exec ${NGINX_CONTAINER} nginx -s reload' >> /var/log/letsencrypt/renew.log 2>&1"
  local cron_file="/etc/cron.d/alfakhir-ssl-renew"

  if [[ -f "$cron_file" ]]; then
    warn "Cron file ${cron_file} already exists. Overwriting..."
  fi

  cat > "${cron_file}" <<EOF
# Al Fakhir School LMS - Let's Encrypt auto-renewal
# Runs at 03:00 daily; renews certs expiring within 30 days
${cron_job}
EOF
  chmod 644 "${cron_file}"
  log "Cron job written to ${cron_file}"
  log "Renewal will run daily at 03:00. Logs: /var/log/letsencrypt/renew.log"
}

# ---------------------------------------------------------------------------
# install
# ---------------------------------------------------------------------------
ssl_install() {
  local dry_run="${1:-false}"

  check_prerequisites

  # DNS checks for all domains
  step "Checking DNS resolution for all domains..."
  local dns_ok=true
  for domain in "${DOMAINS[@]}"; do
    check_dns "${domain}" || dns_ok=false
  done
  if [[ "$dns_ok" == "false" ]]; then
    echo ""
    warn "One or more DNS checks failed. Proceed anyway? (y/N)"
    read -rp "" proceed
    [[ "$proceed" =~ ^[Yy]$ ]] || error "Aborted by user."
  fi

  # Check for existing certs
  step "Checking for existing certificates..."
  for domain in "${DOMAINS[@]}"; do
    check_existing_cert "${domain}" || true
  done

  # Build certbot command
  local certbot_args=(
    "--nginx"
    "--non-interactive"
    "--agree-tos"
    "--email" "${ADMIN_EMAIL}"
    "--redirect"
  )
  for domain in "${DOMAINS[@]}"; do
    certbot_args+=("-d" "${domain}")
  done

  if [[ "$dry_run" == "true" ]]; then
    certbot_args+=("--dry-run")
    step "[DRY RUN] Certbot command:"
    echo "  certbot ${certbot_args[*]}"
  else
    step "Running certbot..."
  fi

  certbot certonly "${certbot_args[@]}" \
    && log "Certificate obtained successfully." \
    || error "certbot failed. Check /var/log/letsencrypt/letsencrypt.log for details."

  if [[ "$dry_run" != "true" ]]; then
    reload_nginx
    setup_cron
    log "SSL installation complete for: ${DOMAINS[*]}"
  else
    log "Dry-run complete. No certificates were issued."
  fi
}

# ---------------------------------------------------------------------------
# renew
# ---------------------------------------------------------------------------
ssl_renew() {
  step "Renewing Let's Encrypt certificates..."
  certbot renew \
    --post-hook "docker exec ${NGINX_CONTAINER} nginx -s reload" \
    --quiet \
    && log "Certificate renewal complete." \
    || error "certbot renew failed. Check /var/log/letsencrypt/letsencrypt.log"

  reload_nginx
}

# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------
ssl_status() {
  step "Certificate expiry status:"
  hr
  local found=false
  for domain in "${DOMAINS[@]}"; do
    local cert_path="${CERTS_DIR}/${domain}/fullchain.pem"
    if [[ -f "$cert_path" ]]; then
      found=true
      local expiry
      expiry=$(openssl x509 -noout -enddate -in "${cert_path}" 2>/dev/null | cut -d= -f2 || echo "parse error")
      local days_left
      days_left=$(( ($(date -d "${expiry}" +%s 2>/dev/null || echo 0) - $(date +%s)) / 86400 ))
      local color
      if   [[ $days_left -gt 30 ]]; then color="${GREEN}"
      elif [[ $days_left -gt 7 ]];  then color="${YELLOW}"
      else color="${RED}"
      fi
      echo -e "  ${domain}"
      echo -e "    Expires: ${expiry}"
      echo -e "    Days left: ${color}${days_left}${NC}"
    else
      echo -e "  ${domain}: ${YELLOW}No certificate found${NC}"
    fi
    echo ""
  done
  [[ "$found" == "false" ]] && warn "No certificates found in ${CERTS_DIR}"
  hr
  info "certbot certificates:"
  certbot certificates 2>/dev/null || warn "certbot certificates command failed."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
[[ -z "$ACTION" ]] && usage

case "$ACTION" in
  install)
    ssl_install false
    ;;
  renew)
    ssl_renew
    ;;
  status)
    ssl_status
    ;;
  test)
    warn "Test mode: dry-run only. No certificates will be issued."
    ssl_install true
    ;;
  *)
    error "Unknown action: ${ACTION}. Use: install | renew | status | test"
    ;;
esac
