#!/bin/bash
# SSL Certificate Auto-Renewal Script
# Setup cron: 0 3 * * * /opt/alfakhir-school/scripts/ssl-renew.sh
# Requirements: certbot installed on host

set -euo pipefail

DOMAINS=(
  "api.alfakhirschool.id"
  "n8n.alfakhirschool.id"
  "minio.alfakhirschool.id"
  "monitoring.alfakhirschool.id"
)
LOG="/var/log/alfakhir-ssl-renew.log"
EMAIL="admin@alfakhirschool.id"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"; }

log "=== SSL Renewal Check ==="

# Check if certbot is available
if ! command -v certbot &>/dev/null; then
  log "ERROR: certbot tidak terinstall. Install: apt install certbot"
  exit 1
fi

# Renew all certificates
certbot renew --quiet --agree-tos --non-interactive 2>> "$LOG"
RENEW_EXIT=$?

if [[ $RENEW_EXIT -eq 0 ]]; then
  log "Renewal check selesai (no renewal needed atau berhasil)"

  # Reload nginx if running in container
  if docker inspect alfakhir_nginx &>/dev/null 2>&1; then
    docker exec alfakhir_nginx nginx -s reload 2>/dev/null && log "Nginx reloaded"
  fi
else
  log "ERROR: Renewal gagal, cek $LOG"
fi

# Check expiry dates for each domain
for domain in "${DOMAINS[@]}"; do
  CERT="/etc/letsencrypt/live/${domain}/cert.pem"
  if [[ -f "$CERT" ]]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
    DAYS_LEFT=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))
    log "$domain: expires $EXPIRY (${DAYS_LEFT} days left)"

    if [[ $DAYS_LEFT -lt 14 ]]; then
      log "WARNING: $domain akan expire dalam $DAYS_LEFT hari!"
      # Send alert email
      echo "SSL cert $domain akan expire dalam $DAYS_LEFT hari!" | \
        mail -s "[ALERT] SSL Expiry Warning - $domain" "$EMAIL" 2>/dev/null || true
    fi
  else
    log "WARN: Cert tidak ditemukan untuk $domain"
  fi
done

log "=== Done ==="
