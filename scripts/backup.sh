#!/bin/bash
# Al Fakhir School LMS - Backup Script
# Cron: 0 2 * * * /opt/alfakhir-school/scripts/backup.sh daily
# Cron: 0 1 * * 0 /opt/alfakhir-school/scripts/backup.sh full

set -euo pipefail

TYPE=${1:-daily}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/alfakhir-school/backups"
PG_BACKUP_DIR="$BACKUP_DIR/postgres"
FILES_BACKUP_DIR="$BACKUP_DIR/files"
RETENTION_DAYS=30
LOG_FILE="/var/log/alfakhir-backup.log"

source /opt/alfakhir-school/.env 2>/dev/null || true

mkdir -p "$PG_BACKUP_DIR" "$FILES_BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
send_alert() {
  if [[ -n "${SMTP_USER:-}" ]]; then
    echo "$1" | mail -s "[ALERT] Al Fakhir Backup" "$SMTP_USER" 2>/dev/null || true
  fi
}

log "=== Backup $TYPE dimulai ==="

# --- PostgreSQL Backup ---
log "Backup PostgreSQL ($TYPE)..."
if [[ "$TYPE" == "full" ]]; then
  DUMP_FILE="$PG_BACKUP_DIR/full_${TIMESTAMP}.sql.gz"
  docker exec alfakhir_postgres pg_dump \
    -U "${POSTGRES_USER:-alfakhir}" \
    "${POSTGRES_DB:-alfakhir_school}" \
    | gzip -9 > "$DUMP_FILE"
  log "Full backup: $DUMP_FILE ($(du -sh $DUMP_FILE | cut -f1))"
else
  DUMP_FILE="$PG_BACKUP_DIR/daily_${TIMESTAMP}.sql.gz"
  docker exec alfakhir_postgres pg_dump \
    -U "${POSTGRES_USER:-alfakhir}" \
    "${POSTGRES_DB:-alfakhir_school}" \
    | gzip -6 > "$DUMP_FILE"
  log "Daily backup: $DUMP_FILE ($(du -sh $DUMP_FILE | cut -f1))"
fi

# --- MinIO/Files Backup ---
log "Backup MinIO files..."
docker run --rm \
  -e MC_HOST_minio="http://${MINIO_ROOT_USER:-alfakhir}:${MINIO_ROOT_PASSWORD:-}@minio:9000" \
  --network alfakhir_net \
  -v "$FILES_BACKUP_DIR:/backups" \
  minio/mc mirror \
  minio/alfakhir-files \
  "/backups/minio_${TIMESTAMP}/" 2>/dev/null || log "MinIO backup dilewati"

# --- Upload ke Backblaze B2 ---
if [[ -n "${B2_ACCOUNT_ID:-}" ]] && command -v b2 &>/dev/null; then
  log "Upload ke Backblaze B2..."
  b2 authorize-account "${B2_ACCOUNT_ID}" "${B2_APPLICATION_KEY}" >/dev/null 2>&1
  b2 upload-file "${B2_BUCKET_NAME:-alfakhir-backups}" "$DUMP_FILE" \
    "postgres/$(basename $DUMP_FILE)" >/dev/null
  log "Upload B2 selesai"
elif command -v restic &>/dev/null && [[ -n "${B2_ACCOUNT_ID:-}" ]]; then
  export RESTIC_REPOSITORY="b2:${B2_BUCKET_NAME:-alfakhir-backups}:restic"
  export B2_ACCOUNT_ID B2_APPLICATION_KEY
  restic backup "$BACKUP_DIR" --tag "alfakhir-$TYPE" --quiet
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune --quiet
  log "Restic backup selesai"
fi

# --- Cleanup old backups ---
log "Hapus backup > $RETENTION_DAYS hari..."
find "$PG_BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$FILES_BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "=== Backup $TYPE selesai. Total: $BACKUP_SIZE ==="
