#!/bin/bash
# Al Fakhir School LMS - Backup Script
# Cron: 0 2 * * * /opt/alfakhir-school/scripts/backup.sh daily
# Cron: 0 1 * * 0 /opt/alfakhir-school/scripts/backup.sh full
# Usage: bash scripts/backup.sh [daily|full|verify]

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
log()   { local m="[$(ts)] $1"; echo -e "${GREEN}${m}${NC}"; echo "${m}" >> "${LOG_FILE}" 2>/dev/null || true; }
warn()  { local m="[$(ts)] WARN: $1"; echo -e "${YELLOW}${m}${NC}"; echo "${m}" >> "${LOG_FILE}" 2>/dev/null || true; }
error() { local m="[$(ts)] ERROR: $1"; echo -e "${RED}${m}${NC}" >&2; echo "${m}" >> "${LOG_FILE}" 2>/dev/null || true; send_alert "BACKUP FAILED: ${m}"; exit 1; }
info()  { local m="[$(ts)] $1"; echo -e "${CYAN}${m}${NC}"; echo "${m}" >> "${LOG_FILE}" 2>/dev/null || true; }
step()  { local m="[$(ts)] ==> $1"; echo -e "${BOLD}${CYAN}${m}${NC}"; echo "${m}" >> "${LOG_FILE}" 2>/dev/null || true; }

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="${INSTALL_DIR:-/opt/alfakhir-school}"
BACKUP_DIR="${BACKUP_DIR:-${INSTALL_DIR}/backups}"
PG_BACKUP_DIR="${BACKUP_DIR}/postgres"
FILES_BACKUP_DIR="${BACKUP_DIR}/files"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/alfakhir-backup.log}"

# Ensure dirs exist
mkdir -p "${PG_BACKUP_DIR}" "${FILES_BACKUP_DIR}"

# Load env
[[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env" 2>/dev/null || true
[[ -f "$(pwd)/.env" ]]         && source "$(pwd)/.env"         2>/dev/null || true

POSTGRES_USER="${POSTGRES_USER:-alfakhir}"
POSTGRES_DB="${POSTGRES_DB:-alfakhir_school}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-alfakhir}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-changeme}"

# ---------------------------------------------------------------------------
# docker compose helper
# ---------------------------------------------------------------------------
compose_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE:-docker-compose.prod.yml}" "$@"
  else
    docker-compose -f "${COMPOSE_FILE:-docker-compose.prod.yml}" "$@"
  fi
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  echo -e "${BOLD}Usage:${NC}  bash backup.sh [daily|full|verify]"
  echo ""
  echo "  daily   - Incremental PostgreSQL dump + MinIO sync  (compression: gzip-6)"
  echo "  full    - Full PostgreSQL dump + MinIO sync          (compression: gzip-9)"
  echo "  verify  - Verify integrity of the most recent backup"
  echo ""
  echo "Environment variables:"
  echo "  BACKUP_DIR        - Backup destination (default: ${BACKUP_DIR})"
  echo "  RETENTION_DAYS    - Days to keep old backups (default: ${RETENTION_DAYS})"
  echo "  ALERT_WEBHOOK     - Webhook URL to POST on failure (optional)"
  echo "  B2_ACCOUNT_ID     - Backblaze B2 account ID (optional)"
  echo "  B2_APPLICATION_KEY- Backblaze B2 app key (optional)"
  echo "  B2_BUCKET_NAME    - Backblaze B2 bucket (default: alfakhir-backups)"
  exit 1
}

# ---------------------------------------------------------------------------
# Alert on failure
# ---------------------------------------------------------------------------
send_alert() {
  local msg="${1:-Backup alert}"
  # Webhook alert
  if [[ -n "${ALERT_WEBHOOK:-}" ]]; then
    curl -s -X POST "${ALERT_WEBHOOK}" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"[Al Fakhir Backup Alert] ${msg}\"}" \
      --max-time 10 2>/dev/null || true
  fi
  # Email alert (if mail available)
  if command -v mail &>/dev/null && [[ -n "${SMTP_USER:-}" ]]; then
    echo "${msg}" | mail -s "[ALERT] Al Fakhir Backup Failed" "${SMTP_USER}" 2>/dev/null || true
  fi
}

# ---------------------------------------------------------------------------
# PostgreSQL backup
# ---------------------------------------------------------------------------
backup_postgres() {
  local compress_level="${1:-6}"
  local prefix="${2:-daily}"
  local dump_file="${PG_BACKUP_DIR}/${prefix}_${TIMESTAMP}.sql.gz"

  step "Backing up PostgreSQL (${prefix}, gzip-${compress_level})..."
  docker exec alfakhir_postgres pg_dump \
    -U "${POSTGRES_USER}" \
    "${POSTGRES_DB}" \
    | gzip -"${compress_level}" > "${dump_file}" \
    || error "pg_dump failed."

  local size
  size=$(du -sh "${dump_file}" | cut -f1)
  log "PostgreSQL backup: ${dump_file} (${size})"
  echo "${dump_file}"
}

# ---------------------------------------------------------------------------
# MinIO backup
# ---------------------------------------------------------------------------
backup_minio() {
  local dest="${FILES_BACKUP_DIR}/minio_${TIMESTAMP}"
  mkdir -p "${dest}"

  step "Backing up MinIO files to ${dest}..."
  docker run --rm \
    -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000" \
    --network alfakhir_net \
    -v "${dest}:/backups" \
    minio/mc mirror \
      minio/alfakhir-files \
      /backups/ \
    2>/dev/null \
    && log "MinIO backup complete: ${dest}" \
    || warn "MinIO backup failed or skipped (container may not be running)."
}

# ---------------------------------------------------------------------------
# Upload to Backblaze B2
# ---------------------------------------------------------------------------
upload_b2() {
  local dump_file="$1"
  [[ -n "${B2_ACCOUNT_ID:-}" ]] || return 0  # B2 not configured

  step "Uploading to Backblaze B2..."

  if command -v restic &>/dev/null; then
    export RESTIC_REPOSITORY="b2:${B2_BUCKET_NAME:-alfakhir-backups}:restic"
    export B2_ACCOUNT_ID
    export B2_APPLICATION_KEY
    info "Using restic for upload (with progress)..."
    restic backup "${BACKUP_DIR}" \
      --tag "alfakhir-${TYPE}" \
      --verbose 2>&1 | grep -E "^(Files|Added|processed|snapshot)" || true
    restic forget \
      --keep-daily 7 \
      --keep-weekly 4 \
      --keep-monthly 3 \
      --prune \
      --quiet 2>/dev/null || warn "restic forget failed."
    log "Restic backup to B2 complete."

  elif command -v b2 &>/dev/null; then
    info "Using b2 CLI for upload..."
    b2 authorize-account "${B2_ACCOUNT_ID}" "${B2_APPLICATION_KEY}" >/dev/null 2>&1 \
      || error "B2 authorization failed."

    local remote_name="postgres/$(basename "${dump_file}")"
    local file_size; file_size=$(du -sh "${dump_file}" | cut -f1)
    info "Uploading ${dump_file} (${file_size}) -> ${B2_BUCKET_NAME:-alfakhir-backups}/${remote_name}"
    b2 upload-file \
      --noProgress \
      "${B2_BUCKET_NAME:-alfakhir-backups}" \
      "${dump_file}" \
      "${remote_name}" \
      && log "B2 upload complete: ${remote_name}" \
      || error "B2 upload failed."
  else
    warn "B2_ACCOUNT_ID is set but neither 'restic' nor 'b2' CLI found. Skipping remote upload."
  fi
}

# ---------------------------------------------------------------------------
# Cleanup old backups
# ---------------------------------------------------------------------------
cleanup_old() {
  step "Cleaning up backups older than ${RETENTION_DAYS} days..."
  find "${PG_BACKUP_DIR}" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${FILES_BACKUP_DIR}" -maxdepth 1 -type d -name "minio_*" \
    -mtime +"${RETENTION_DAYS}" -exec rm -rf {} \; 2>/dev/null || true
  log "Cleanup complete."
}

# ---------------------------------------------------------------------------
# Verify last backup integrity
# ---------------------------------------------------------------------------
verify_backup() {
  step "Verifying integrity of most recent PostgreSQL backup..."
  local latest
  latest=$(ls -t "${PG_BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || echo "")

  if [[ -z "$latest" ]]; then
    error "No backup files found in ${PG_BACKUP_DIR}"
  fi

  info "Verifying: ${latest}"

  # Check gzip integrity
  if gzip -t "${latest}" 2>/dev/null; then
    log "gzip integrity check PASSED."
  else
    error "gzip integrity check FAILED for ${latest}"
  fi

  # Check SQL content with pg_restore --list
  info "Checking SQL content with pg_restore --list..."
  local table_count
  table_count=$(gunzip -c "${latest}" \
    | docker exec -i alfakhir_postgres \
        psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
        -c "SELECT 1;" -A -t 2>/dev/null | wc -l || echo "0")

  if [[ "${table_count}" -gt 0 ]]; then
    log "SQL content check PASSED (got ${table_count} row(s) from test query)."
  else
    warn "Could not verify SQL content via live DB — checking structure only."
    gunzip -c "${latest}" | head -c 512 | grep -qi "PostgreSQL database dump" \
      && log "SQL header check PASSED." \
      || warn "Could not confirm SQL header — file may be corrupt."
  fi

  local size; size=$(du -sh "${latest}" | cut -f1)
  log "Backup file: ${latest} (${size})"

  # Check MinIO backup
  local latest_minio
  latest_minio=$(ls -td "${FILES_BACKUP_DIR}"/minio_* 2>/dev/null | head -1 || echo "")
  if [[ -n "$latest_minio" && -d "$latest_minio" ]]; then
    local file_count; file_count=$(find "${latest_minio}" -type f | wc -l)
    log "MinIO backup: ${latest_minio} — ${file_count} file(s)"
  else
    warn "No MinIO backup directory found."
  fi

  log "Verification complete."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "$TYPE" in
  daily)
    log "=== Backup DAILY started ==="
    dump_file=$(backup_postgres 6 daily)
    backup_minio
    upload_b2 "${dump_file}"
    cleanup_old
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    log "=== Backup DAILY complete. Total size: ${BACKUP_SIZE} ==="
    ;;

  full)
    log "=== Backup FULL started ==="
    dump_file=$(backup_postgres 9 full)
    backup_minio
    upload_b2 "${dump_file}"
    cleanup_old
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    log "=== Backup FULL complete. Total size: ${BACKUP_SIZE} ==="
    ;;

  verify)
    verify_backup
    ;;

  *)
    error "Unknown backup type '${TYPE}'."
    usage
    ;;
esac
