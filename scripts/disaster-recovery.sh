#!/bin/bash
# Al Fakhir School LMS - Disaster Recovery / Failover Script
# Usage: bash scripts/disaster-recovery.sh [failover|status|test|promote-standby]

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

REPORT_FILE="/tmp/dr-report.txt"
ACTION="${1:-}"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
INSTALL_DIR="${INSTALL_DIR:-/opt/alfakhir-school}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

[[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env" 2>/dev/null || true
[[ -f "$(pwd)/.env" ]]         && source "$(pwd)/.env"         2>/dev/null || true

POSTGRES_USER="${POSTGRES_USER:-alfakhir}"
POSTGRES_DB="${POSTGRES_DB:-alfakhir_school}"

# Primary and standby container names
PRIMARY_CONTAINER="${PRIMARY_CONTAINER:-alfakhir_postgres}"
STANDBY_CONTAINER="${STANDBY_CONTAINER:-alfakhir_postgres_standby}"

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
  echo -e "${BOLD}Usage:${NC}  bash disaster-recovery.sh [failover|status|test|promote-standby]"
  echo ""
  echo "  status          - Show replication lag between primary and standby"
  echo "  failover        - Promote standby to primary and restart services"
  echo "  test            - Dry-run failover without actual promotion"
  echo "  promote-standby - Promote standby PostgreSQL replica only (no env update)"
  echo ""
  exit 1
}

# ---------------------------------------------------------------------------
# Write to report file
# ---------------------------------------------------------------------------
report() {
  echo "$1" | tee -a "${REPORT_FILE}"
}

init_report() {
  cat > "${REPORT_FILE}" <<EOF
======================================================
  Al Fakhir School LMS - Disaster Recovery Report
  Generated: $(ts)
  Action: ${ACTION}
======================================================

EOF
  log "Report will be written to: ${REPORT_FILE}"
}

# ---------------------------------------------------------------------------
# Check if a container is running
# ---------------------------------------------------------------------------
container_running() {
  docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -q "true"
}

# ---------------------------------------------------------------------------
# status: show replication lag
# ---------------------------------------------------------------------------
dr_status() {
  step "Checking PostgreSQL replication status..."
  report "--- Replication Status ($(ts)) ---"

  # Primary status
  if container_running "${PRIMARY_CONTAINER}"; then
    info "Primary container '${PRIMARY_CONTAINER}': RUNNING"
    report "Primary (${PRIMARY_CONTAINER}): RUNNING"

    local primary_wal
    primary_wal=$(docker exec "${PRIMARY_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -At -c "SELECT pg_current_wal_lsn();" 2>/dev/null || echo "N/A")
    info "Primary WAL LSN: ${primary_wal}"
    report "Primary WAL LSN: ${primary_wal}"

    local rep_info
    rep_info=$(docker exec "${PRIMARY_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -c \
      "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
              write_lag, flush_lag, replay_lag
       FROM pg_stat_replication;" 2>/dev/null || echo "No replication info available")
    info "Replication slots:"
    echo "$rep_info"
    report "$rep_info"
  else
    warn "Primary container '${PRIMARY_CONTAINER}' is NOT running."
    report "Primary (${PRIMARY_CONTAINER}): NOT RUNNING"
  fi

  echo ""

  # Standby status
  if container_running "${STANDBY_CONTAINER}"; then
    info "Standby container '${STANDBY_CONTAINER}': RUNNING"
    report "Standby (${STANDBY_CONTAINER}): RUNNING"

    local standby_lsn
    standby_lsn=$(docker exec "${STANDBY_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -At -c "SELECT pg_last_wal_receive_lsn();" 2>/dev/null || echo "N/A")
    info "Standby last received LSN: ${standby_lsn}"
    report "Standby last received LSN: ${standby_lsn}"

    local in_recovery
    in_recovery=$(docker exec "${STANDBY_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -At -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "unknown")
    info "Standby in recovery mode: ${in_recovery}"
    report "Standby in recovery mode: ${in_recovery}"
  else
    warn "Standby container '${STANDBY_CONTAINER}' is NOT running."
    report "Standby (${STANDBY_CONTAINER}): NOT RUNNING"
  fi

  echo ""
  hr

  # Service health overview
  step "Current container statuses:"
  report ""
  report "--- Container Statuses ---"
  local status_output
  status_output=$(compose_cmd ps 2>/dev/null || docker ps --filter "name=alfakhir" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null)
  echo "$status_output"
  report "$status_output"
}

# ---------------------------------------------------------------------------
# promote_standby: pg_ctl promote on standby container
# ---------------------------------------------------------------------------
promote_standby() {
  local dry_run="${1:-false}"

  step "Promoting standby PostgreSQL replica..."

  container_running "${STANDBY_CONTAINER}" \
    || error "Standby container '${STANDBY_CONTAINER}' is not running. Cannot promote."

  local in_recovery
  in_recovery=$(docker exec "${STANDBY_CONTAINER}" \
    psql -U "${POSTGRES_USER}" -At -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "false")

  if [[ "$in_recovery" != "t" ]]; then
    warn "Standby is NOT in recovery mode (pg_is_in_recovery = ${in_recovery}). It may already be primary."
    report "WARNING: Standby pg_is_in_recovery = ${in_recovery}"
  fi

  if [[ "$dry_run" == "true" ]]; then
    warn "[DRY RUN] Would execute: docker exec ${STANDBY_CONTAINER} pg_ctl promote -D /var/lib/postgresql/data"
    report "[DRY RUN] Promotion skipped."
    return 0
  fi

  log "Executing pg_ctl promote on ${STANDBY_CONTAINER}..."
  docker exec "${STANDBY_CONTAINER}" \
    su postgres -c "pg_ctl promote -D /var/lib/postgresql/data" \
    && log "Promotion signal sent." \
    || error "pg_ctl promote failed."

  # Wait for standby to finish promotion
  log "Waiting for standby to complete promotion (max 30s)..."
  local waited=0
  while [[ $waited -lt 30 ]]; do
    local still_recovering
    still_recovering=$(docker exec "${STANDBY_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -At -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "t")
    if [[ "$still_recovering" == "f" ]]; then
      log "Standby successfully promoted to primary."
      report "Promotion: SUCCESS at $(ts)"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  warn "Standby promotion timed out. Check container logs: docker logs ${STANDBY_CONTAINER}"
  report "Promotion: TIMEOUT"
}

# ---------------------------------------------------------------------------
# update_backend_env: point backend at new primary
# ---------------------------------------------------------------------------
update_backend_env() {
  local dry_run="${1:-false}"
  local new_host="${STANDBY_CONTAINER}"

  step "Updating backend environment to point to new primary (${new_host})..."
  report "Updating DATABASE_HOST to: ${new_host}"

  if [[ "$dry_run" == "true" ]]; then
    warn "[DRY RUN] Would update DATABASE_HOST in .env to '${new_host}'"
    return 0
  fi

  local env_file
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    env_file="${INSTALL_DIR}/.env"
  elif [[ -f "$(pwd)/.env" ]]; then
    env_file="$(pwd)/.env"
  else
    warn "No .env file found. Skipping DATABASE_HOST update. Update manually."
    return 0
  fi

  # Replace DATABASE_HOST line
  if grep -q "^DATABASE_HOST=" "${env_file}"; then
    sed -i "s|^DATABASE_HOST=.*|DATABASE_HOST=${new_host}|" "${env_file}"
    log "DATABASE_HOST updated in ${env_file}"
  else
    echo "DATABASE_HOST=${new_host}" >> "${env_file}"
    log "DATABASE_HOST appended to ${env_file}"
  fi
}

# ---------------------------------------------------------------------------
# verify_health_after_failover
# ---------------------------------------------------------------------------
verify_health() {
  step "Verifying API health after failover..."
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" ]]; then
    log "API health check PASSED (HTTP ${http_code})"
    report "API health check: PASSED (HTTP ${http_code})"
  else
    warn "API health check returned HTTP ${http_code}."
    report "API health check: FAILED (HTTP ${http_code})"
  fi
}

# ---------------------------------------------------------------------------
# dns_notice
# ---------------------------------------------------------------------------
dns_notice() {
  hr
  echo -e "${YELLOW}${BOLD}MANUAL ACTION REQUIRED: DNS Update${NC}"
  echo -e "${YELLOW}Update your DNS records to point to the new primary server IP.${NC}"
  echo -e "${YELLOW}Typical records to update:${NC}"
  echo -e "  api.alfakhirschool.id   -> <new_primary_ip>"
  echo -e "  n8n.alfakhirschool.id   -> <new_primary_ip>"
  echo -e "  minio.alfakhirschool.id -> <new_primary_ip>"
  echo ""
  echo -e "${YELLOW}After DNS propagation (TTL), verify with:${NC}"
  echo -e "  dig api.alfakhirschool.id"
  hr
  report ""
  report "=== MANUAL STEP: Update DNS records to new primary IP ==="
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
[[ -z "$ACTION" ]] && usage

init_report

case "$ACTION" in
  status)
    dr_status
    ;;

  failover)
    hr
    echo -e "${RED}${BOLD}FAILOVER MODE - This will promote standby to primary.${NC}"
    echo -e "${RED}Ensure the primary is truly unreachable before proceeding.${NC}"
    hr
    read -rp "Type 'FAILOVER' to confirm: " answer
    [[ "$answer" == "FAILOVER" ]] || error "Failover cancelled."

    report "=== FAILOVER INITIATED at $(ts) ==="

    step "Step 1/5: Stopping backend and n8n..."
    compose_cmd stop backend n8n 2>/dev/null || warn "Services may not be running."
    report "Step 1: backend and n8n stopped."

    step "Step 2/5: Promoting standby PostgreSQL..."
    promote_standby false
    report "Step 2: Standby promoted."

    step "Step 3/5: Updating backend .env..."
    update_backend_env false
    report "Step 3: Backend env updated."

    step "Step 4/5: Restarting all services..."
    compose_cmd up -d
    log "Waiting for backend (max 90s)..."
    timeout 90 bash -c \
      'until curl -sf http://localhost:3001/api/health > /dev/null 2>&1; do sleep 3; done' \
      && log "Backend healthy." \
      || warn "Backend not responding after 90s."
    report "Step 4: Services restarted."

    step "Step 5/5: Verifying health..."
    verify_health

    dns_notice

    report ""
    report "=== FAILOVER COMPLETE at $(ts) ==="
    log "Failover complete. Report saved to: ${REPORT_FILE}"
    ;;

  test)
    hr
    warn "TEST MODE - Dry run. No actual changes will be made."
    hr

    report "=== FAILOVER DRY-RUN at $(ts) ==="

    step "[DRY RUN] Step 1: Would stop backend and n8n."
    report "[DRY RUN] Stop backend + n8n"

    step "[DRY RUN] Step 2: Promote standby..."
    promote_standby true

    step "[DRY RUN] Step 3: Update backend env..."
    update_backend_env true

    step "[DRY RUN] Step 4: Would restart all services."
    report "[DRY RUN] Restart all services"

    step "[DRY RUN] Step 5: Would verify health."
    report "[DRY RUN] Health check"

    dns_notice

    report ""
    report "=== DRY-RUN COMPLETE at $(ts) ==="
    log "Dry-run complete. No changes made."
    log "Report saved to: ${REPORT_FILE}"
    ;;

  promote-standby)
    hr
    echo -e "${YELLOW}${BOLD}This will promote the standby replica without modifying other settings.${NC}"
    hr
    read -rp "Type 'PROMOTE' to confirm: " answer
    [[ "$answer" == "PROMOTE" ]] || error "Promotion cancelled."

    promote_standby false
    report "Standalone promotion complete at $(ts)"
    log "Promotion complete. Report saved to: ${REPORT_FILE}"
    ;;

  *)
    error "Unknown action: ${ACTION}. Use: failover | status | test | promote-standby"
    ;;
esac
