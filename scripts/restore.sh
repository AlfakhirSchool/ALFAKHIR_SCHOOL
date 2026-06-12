#!/bin/bash
# Al Fakhir School LMS - Full Backup Restoration Script
# Usage: bash scripts/restore.sh [postgres|minio|all] [backup_file_path]

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

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
RESTORE_TYPE="${1:-}"
BACKUP_FILE="${2:-}"

INSTALL_DIR="${INSTALL_DIR:-/opt/alfakhir-school}"
BACKUP_DIR="${BACKUP_DIR:-${INSTALL_DIR}/backups}"
PG_BACKUP_DIR="${BACKUP_DIR}/postgres"
FILES_BACKUP_DIR="${BACKUP_DIR}/files"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Load env if available
[[ -f "${INSTALL_DIR}/.env" ]]      && source "${INSTALL_DIR}/.env" 2>/dev/null || true
[[ -f "$(pwd)/.env" ]]              && source "$(pwd)/.env"         2>/dev/null || true

POSTGRES_USER="${POSTGRES_USER:-alfakhir}"
POSTGRES_DB="${POSTGRES_DB:-alfakhir_school}"

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
  echo -e "${BOLD}Usage:${NC}  bash restore.sh [postgres|minio|all] [backup_file_path]"
  echo ""
  echo "  postgres  - Restore PostgreSQL database from a .sql.gz backup file"
  echo "  minio     - Restore MinIO files from a backup directory"
  echo "  all       - Restore both PostgreSQL and MinIO"
  echo ""
  echo "  If backup_file_path is omitted, available backups are listed."
  echo ""
  echo "Examples:"
  echo "  bash restore.sh postgres"
  echo "  bash restore.sh postgres /opt/alfakhir-school/backups/postgres/full_20250101_020000.sql.gz"
  echo "  bash restore.sh minio /opt/alfakhir-school/backups/files/minio_20250101_020000"
  echo "  bash restore.sh all"
  exit 1
}

# ---------------------------------------------------------------------------
# List available backups
# ---------------------------------------------------------------------------
list_backups() {
  local type="${1:-all}"
  echo ""
  if [[ "$type" == "postgres" || "$type" == "all" ]]; then
    info "Available PostgreSQL backups in ${PG_BACKUP_DIR}:"
    if ls "${PG_BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -20; then
      true
    else
      warn "No PostgreSQL backup files found in ${PG_BACKUP_DIR}"
    fi
  fi
  if [[ "$type" == "minio" || "$type" == "all" ]]; then
    echo ""
    info "Available MinIO backups in ${FILES_BACKUP_DIR}:"
    if ls -d "${FILES_BACKUP_DIR}"/minio_* 2>/dev/null | head -20; then
      true
    else
      warn "No MinIO backup directories found in ${FILES_BACKUP_DIR}"
    fi
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Safety confirmation
# ---------------------------------------------------------------------------
confirm() {
  local msg="${1:-Are you sure?}"
  echo -e "${YELLOW}${BOLD}${msg}${NC}"
  echo -e "${RED}THIS WILL OVERWRITE EXISTING DATA. This action cannot be undone.${NC}"
  read -rp "Type 'YES' to confirm: " answer
  [[ "$answer" == "YES" ]] || error "Restore cancelled by user."
}

# ---------------------------------------------------------------------------
# Pre-restore: stop backend and n8n
# ---------------------------------------------------------------------------
stop_services() {
  step "Stopping backend and n8n services before restore..."
  compose_cmd stop backend n8n 2>/dev/null || warn "Some services may not have been running."
  log "backend and n8n stopped."
}

# ---------------------------------------------------------------------------
# Post-restore: restart all services
# ---------------------------------------------------------------------------
restart_services() {
  step "Restarting all services..."
  compose_cmd up -d
  log "Services started. Waiting for backend to be healthy (max 90s)..."
  timeout 90 bash -c \
    'until curl -sf http://localhost:3001/api/health > /dev/null 2>&1; do sleep 3; done' \
    && log "Backend is healthy." \
    || warn "Backend did not respond within 90s — check logs with: docker logs alfakhir_backend"
}

# ---------------------------------------------------------------------------
# Verify API health
# ---------------------------------------------------------------------------
verify_health() {
  step "Verifying API health..."
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" ]]; then
    log "API health check PASSED (HTTP ${http_code})"
  else
    warn "API health check returned HTTP ${http_code}. Manual inspection may be required."
  fi
}

# ---------------------------------------------------------------------------
# Restore PostgreSQL
# ---------------------------------------------------------------------------
restore_postgres() {
  local backup_file="${1:-}"

  if [[ -z "$backup_file" ]]; then
    list_backups postgres
    read -rp "Enter full path to the .sql.gz file to restore: " backup_file
  fi

  [[ -f "$backup_file" ]] || error "Backup file not found: ${backup_file}"
  [[ "$backup_file" == *.sql.gz ]] || error "Expected a .sql.gz file, got: ${backup_file}"

  confirm "Restore PostgreSQL database '${POSTGRES_DB}' from: ${backup_file}?"

  step "Restoring PostgreSQL from ${backup_file}..."
  log "Dropping and recreating database..."
  docker exec alfakhir_postgres psql -U "${POSTGRES_USER}" -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    postgres 2>/dev/null || true
  docker exec alfakhir_postgres psql -U "${POSTGRES_USER}" -c \
    "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres
  docker exec alfakhir_postgres psql -U "${POSTGRES_USER}" -c \
    "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};" postgres

  log "Streaming decompressed SQL into database..."
  gunzip -c "${backup_file}" | docker exec -i alfakhir_postgres \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -q

  log "PostgreSQL restore complete."
}

# ---------------------------------------------------------------------------
# Restore MinIO
# ---------------------------------------------------------------------------
restore_minio() {
  local backup_dir="${1:-}"

  if [[ -z "$backup_dir" ]]; then
    list_backups minio
    read -rp "Enter full path to the MinIO backup directory to restore: " backup_dir
  fi

  [[ -d "$backup_dir" ]] || error "Backup directory not found: ${backup_dir}"

  confirm "Restore MinIO files from: ${backup_dir}?"

  step "Restoring MinIO from ${backup_dir}..."
  docker run --rm \
    -e MC_HOST_minio="http://${MINIO_ROOT_USER:-alfakhir}:${MINIO_ROOT_PASSWORD:-changeme}@minio:9000" \
    --network alfakhir_net \
    -v "${backup_dir}:/restore-src:ro" \
    minio/mc mirror --overwrite --remove \
    /restore-src/ \
    minio/alfakhir-files \
    && log "MinIO restore complete." \
    || error "MinIO restore failed."
}

# ---------------------------------------------------------------------------
# Restore from Backblaze B2
# ---------------------------------------------------------------------------
restore_from_b2() {
  local backup_name="${1:-}"
  [[ -n "${B2_ACCOUNT_ID:-}" ]] || return 1  # B2 not configured

  step "Restoring from Backblaze B2..."
  command -v b2 &>/dev/null || error "b2 CLI not installed. Install with: pip install b2"

  b2 authorize-account "${B2_ACCOUNT_ID}" "${B2_APPLICATION_KEY}" >/dev/null

  if [[ -z "$backup_name" ]]; then
    info "Available files in B2 bucket ${B2_BUCKET_NAME:-alfakhir-backups}:"
    b2 ls "${B2_BUCKET_NAME:-alfakhir-backups}" postgres/
    read -rp "Enter filename (relative to bucket, e.g. postgres/full_20250101.sql.gz): " backup_name
  fi

  local local_file="${PG_BACKUP_DIR}/$(basename "${backup_name}")"
  log "Downloading ${backup_name} from B2 to ${local_file}..."
  b2 download-file-by-name \
    "${B2_BUCKET_NAME:-alfakhir-backups}" \
    "${backup_name}" \
    "${local_file}"
  log "Download complete: ${local_file}"
  echo "${local_file}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
[[ -z "$RESTORE_TYPE" ]] && usage

case "$RESTORE_TYPE" in
  postgres)
    # If B2 configured and no local file given, offer B2 download
    resolved_file="${BACKUP_FILE:-}"
    if [[ -z "$resolved_file" ]] && [[ -n "${B2_ACCOUNT_ID:-}" ]]; then
      echo -e "${YELLOW}B2_ACCOUNT_ID is set. Restore from Backblaze B2? (y/N)${NC}"
      read -rp "" use_b2
      if [[ "$use_b2" =~ ^[Yy]$ ]]; then
        resolved_file=$(restore_from_b2 "")
      fi
    fi
    stop_services
    restore_postgres "${resolved_file}"
    restart_services
    verify_health
    ;;

  minio)
    stop_services
    restore_minio "${BACKUP_FILE:-}"
    restart_services
    verify_health
    ;;

  all)
    pg_file="${BACKUP_FILE:-}"
    if [[ -z "$pg_file" ]] && [[ -n "${B2_ACCOUNT_ID:-}" ]]; then
      echo -e "${YELLOW}B2_ACCOUNT_ID is set. Download PostgreSQL backup from B2? (y/N)${NC}"
      read -rp "" use_b2
      if [[ "$use_b2" =~ ^[Yy]$ ]]; then
        pg_file=$(restore_from_b2 "")
      fi
    fi
    stop_services
    restore_postgres "${pg_file}"
    restore_minio ""
    restart_services
    verify_health
    ;;

  list)
    list_backups all
    ;;

  *)
    error "Unknown restore type: ${RESTORE_TYPE}. Use: postgres | minio | all | list"
    ;;
esac

log "=== Restore finished successfully ==="
