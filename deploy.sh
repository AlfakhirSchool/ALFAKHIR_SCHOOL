#!/bin/bash
# deploy.sh — smart deploy: rebuild hanya service yang berubah
# Usage: ./deploy.sh [--force] [--all]
set -e

COMPOSE="docker compose -f docker-compose.prod.yml"
DATA_DIR="/opt/alfakhir-data"
BACKUP_DIR="./backups/postgres"
LAST_DEPLOY_FILE=".last_deploy_commit"

echo "=== Al Fakhir School Deploy ==="

# ── Pastikan folder data ada ──────────────────────────────────────────────────
mkdir -p "$DATA_DIR/postgres" "$DATA_DIR/redis" "$DATA_DIR/minio" "$DATA_DIR/uploads"
mkdir -p "$BACKUP_DIR"

# ── Backup DB sebelum deploy ──────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q alfakhir_postgres; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
  echo "[backup] Database → $BACKUP_FILE"
  docker exec alfakhir_postgres pg_dump -U "${POSTGRES_USER:-alfakhir}" "${POSTGRES_DB:-alfakhir_school}" | gzip > "$BACKUP_FILE"
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
fi

# ── Pull kode terbaru ─────────────────────────────────────────────────────────
echo "[git] Pulling latest..."
git pull origin main

CURRENT=$(git rev-parse HEAD)

# ── Deteksi perubahan ─────────────────────────────────────────────────────────
FORCE=false
[[ "${1:-}" == "--force" || "${1:-}" == "--all" ]] && FORCE=true

if $FORCE; then
  REBUILD_ADMIN=true
  REBUILD_GURU=true
  REBUILD_BACKEND=true
  echo "[mode] Force rebuild semua service"
elif [[ -f "$LAST_DEPLOY_FILE" ]]; then
  LAST=$(cat "$LAST_DEPLOY_FILE")
  if [[ "$LAST" == "$CURRENT" ]]; then
    echo "[info] Tidak ada commit baru. Gunakan --force untuk rebuild."
    exit 0
  fi
  CHANGED=$(git diff --name-only "$LAST" "$CURRENT" 2>/dev/null || echo "")
  echo "[detect] Perubahan sejak deploy terakhir:"
  echo "$CHANGED" | sed 's/^/  /'
  echo ""

  REBUILD_ADMIN=false
  REBUILD_GURU=false
  REBUILD_BACKEND=false

  echo "$CHANGED" | grep -q "^frontend/web-admin"  && REBUILD_ADMIN=true   || true
  echo "$CHANGED" | grep -q "^frontend/web-guru"   && REBUILD_GURU=true    || true
  echo "$CHANGED" | grep -q "^backend/"            && REBUILD_BACKEND=true || true
  # perubahan infra → rebuild semua
  echo "$CHANGED" | grep -qE "^docker-compose|^nginx/|^\.env" && {
    REBUILD_ADMIN=true; REBUILD_GURU=true; REBUILD_BACKEND=true
    echo "[detect] Perubahan infra — rebuild semua service"
  } || true
else
  # Pertama kali deploy: rebuild semua
  echo "[detect] Tidak ada histori deploy — rebuild semua"
  REBUILD_ADMIN=true
  REBUILD_GURU=true
  REBUILD_BACKEND=true
fi

# ── Build ─────────────────────────────────────────────────────────────────────
SERVICES=""

if $REBUILD_BACKEND; then
  echo "[build] backend..."
  $COMPOSE build backend
  SERVICES="$SERVICES backend"
else
  echo "[skip]  backend"
fi

if $REBUILD_ADMIN; then
  echo "[build] web-admin..."
  $COMPOSE build web-admin
  SERVICES="$SERVICES web-admin"
else
  echo "[skip]  web-admin"
fi

if $REBUILD_GURU; then
  echo "[build] web-guru..."
  $COMPOSE build web-guru
  SERVICES="$SERVICES web-guru"
else
  echo "[skip]  web-guru"
fi

# ── Restart service yang direbuild ────────────────────────────────────────────
if [[ -z "$SERVICES" ]]; then
  echo "[done] Tidak ada service yang direbuild."
else
  echo ""
  echo "[up] Restart:$SERVICES"
  $COMPOSE up -d --no-deps $SERVICES

  # Pastikan infra tetap running
  $COMPOSE up -d postgres redis 2>/dev/null || true
fi

# ── Simpan commit deploy ──────────────────────────────────────────────────────
echo "$CURRENT" > "$LAST_DEPLOY_FILE"

echo ""
echo "=== Deploy selesai! ==="
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}"
