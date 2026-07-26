#!/bin/bash
# Deploy script - NEVER hapus data, hanya rebuild app
set -e

COMPOSE="docker compose -f docker-compose.prod.yml"
DATA_DIR="/opt/alfakhir-data"
BACKUP_DIR="./backups/postgres"

echo "=== Al Fakhir School Deploy ==="

# 1. Buat folder data jika belum ada
mkdir -p "$DATA_DIR/postgres" "$DATA_DIR/redis" "$DATA_DIR/minio" "$DATA_DIR/uploads"
mkdir -p "$BACKUP_DIR"

# 2. Backup DB sebelum deploy (jika postgres running)
if docker ps --format '{{.Names}}' | grep -q alfakhir_postgres; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
  echo "Backup database ke $BACKUP_FILE ..."
  docker exec alfakhir_postgres pg_dump -U "${POSTGRES_USER:-alfakhir}" "${POSTGRES_DB:-alfakhir_school}" | gzip > "$BACKUP_FILE"
  echo "Backup selesai: $BACKUP_FILE"
  # Hapus backup lebih dari 7 hari
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
fi

# 3. Pull kode terbaru
echo "Pull dari GitHub..."
git pull origin main

# 4. Build HANYA web app (tidak rebuild postgres/redis/backend jika tidak perlu)
SERVICES="${1:-web-guru web-admin}"
echo "Build service: $SERVICES"
$COMPOSE build $SERVICES

# 5. Restart HANYA service yang di-build (bukan semua)
echo "Restart service..."
$COMPOSE up -d --no-deps --force-recreate $SERVICES

# 6. Pastikan semua service lain masih running
$COMPOSE up -d postgres redis backend 2>/dev/null || true

echo ""
echo "=== Deploy selesai! ==="
$COMPOSE ps
