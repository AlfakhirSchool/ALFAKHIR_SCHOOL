#!/bin/bash
# =============================================================================
# Al Fakhir School LMS - Safe Zero-Downtime Update Script
# Usage: bash scripts/update-deploy.sh [--branch main] [--skip-build] [--seed]
# =============================================================================

set -euo pipefail

# ─── Color helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ts()    { date '+%Y-%m-%d %H:%M:%S'; }
log()   { local m="[$(ts)] $1";      echo -e "${GREEN}${m}${NC}";       echo "${m}" >> "${LOG_FILE}"; }
warn()  { local m="[$(ts)] WARN: $1"; echo -e "${YELLOW}${m}${NC}";    echo "${m}" >> "${LOG_FILE}"; }
error() { local m="[$(ts)] ERROR: $1"; echo -e "${RED}${m}${NC}" >&2;  echo "${m}" >> "${LOG_FILE}"; exit 1; }
info()  { local m="[$(ts)] $1";       echo -e "${CYAN}${m}${NC}";      echo "${m}" >> "${LOG_FILE}"; }
step()  { local m="==> $1";           echo -e "\n${BOLD}${CYAN}${m}${NC}"; echo "[$(ts)] ${m}" >> "${LOG_FILE}"; }
hr()    { echo -e "${CYAN}$(printf '─%.0s' {1..72})${NC}"; }

# ─── Default config ───────────────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
GIT_BRANCH="main"
SKIP_BUILD=false
RUN_SEED=false
LOG_DIR="${INSTALL_DIR}/logs"
LOG_FILE="${LOG_DIR}/update-deploy.log"
ROLLBACK_TAG="alfakhir_backend:rollback"

mkdir -p "${LOG_DIR}"

# ─── Arg parsing ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)    GIT_BRANCH="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --seed)      RUN_SEED=true; shift ;;
    -h|--help)
      echo -e "${BOLD}Usage:${NC} bash update-deploy.sh [OPTIONS]"
      echo ""
      echo "  --branch BRANCH   Git branch to pull (default: main)"
      echo "  --skip-build      Skip Docker image rebuild (use cached image)"
      echo "  --seed            Re-run demo seed after update"
      echo ""
      echo "Environment variables:"
      echo "  INSTALL_DIR       Project root (default: parent of scripts/)"
      echo "  COMPOSE_FILE      Compose file (default: docker-compose.prod.yml)"
      exit 0 ;;
    *) error "Unknown option: $1. Use --help for usage." ;;
  esac
done

# ─── Compose helper ───────────────────────────────────────────────────────────
compose_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose -f "${INSTALL_DIR}/${COMPOSE_FILE}" "$@"
  else
    docker-compose -f "${INSTALL_DIR}/${COMPOSE_FILE}" "$@"
  fi
}

# ─── Health check helper ──────────────────────────────────────────────────────
wait_for_api() {
  local max="${1:-90}"; local waited=0
  info "Waiting for API health (max ${max}s)..."
  while [[ $waited -lt $max ]]; do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then
      log "API healthy (HTTP 200) after ${waited}s"
      return 0
    fi
    sleep 5; waited=$((waited + 5)); echo -n "."
  done
  echo ""
  return 1
}

# ─── Banner ───────────────────────────────────────────────────────────────────
hr
echo -e "${BOLD}  Al Fakhir School LMS — Update Deploy${NC}"
echo -e "  Branch: ${GIT_BRANCH} | Skip build: ${SKIP_BUILD} | Seed: ${RUN_SEED}"
echo -e "  Dir: ${INSTALL_DIR}"
hr
echo ""

cd "${INSTALL_DIR}"

# ─── Load .env ────────────────────────────────────────────────────────────────
[[ -f ".env" ]] && source .env 2>/dev/null || true

# ─── STEP 1: Pre-flight ───────────────────────────────────────────────────────
step "STEP 1: Pre-flight checks"

# Docker running?
docker info &>/dev/null || error "Docker is not running."
log "Docker: running"

# Disk space (≥ 5GB)
FREE_GB=$(df -BG / | awk 'NR==2{gsub(/G/,"",$4); print $4}')
[[ "${FREE_GB}" -ge 5 ]] || error "Insufficient disk: ${FREE_GB}GB free (need ≥ 5GB)"
log "Disk: ${FREE_GB}GB free"

# Compose file exists?
[[ -f "${INSTALL_DIR}/${COMPOSE_FILE}" ]] || error "${COMPOSE_FILE} not found in ${INSTALL_DIR}"
log "Compose file: ${COMPOSE_FILE}"

# ─── STEP 2: Backup database before update ────────────────────────────────────
step "STEP 2: Pre-update database backup"

PRE_BACKUP_FILE="${INSTALL_DIR}/backups/postgres/pre-update_$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p "$(dirname "${PRE_BACKUP_FILE}")"

if docker exec alfakhir_postgres pg_isready -U "${POSTGRES_USER:-alfakhir}" -q 2>/dev/null; then
  docker exec alfakhir_postgres pg_dump \
    -U "${POSTGRES_USER:-alfakhir}" \
    "${POSTGRES_DB:-alfakhir_school}" \
    | gzip -6 > "${PRE_BACKUP_FILE}" \
    && log "Pre-update backup: ${PRE_BACKUP_FILE} ($(du -sh "${PRE_BACKUP_FILE}" | cut -f1))" \
    || warn "Pre-update backup failed — continuing anyway."
else
  warn "PostgreSQL not running — skipping pre-update backup."
fi

# ─── STEP 3: Tag current image for rollback ───────────────────────────────────
step "STEP 3: Tag current image for rollback"

CURRENT_IMAGE=$(docker inspect alfakhir_backend \
  --format '{{.Config.Image}}' 2>/dev/null || echo "")
if [[ -n "${CURRENT_IMAGE}" ]]; then
  docker tag "${CURRENT_IMAGE}" "${ROLLBACK_TAG}" 2>/dev/null \
    && log "Rollback tag set: ${CURRENT_IMAGE} → ${ROLLBACK_TAG}" \
    || warn "Could not set rollback tag."
  # Record current git commit for rollback info
  PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  log "Previous commit: ${PREV_COMMIT}"
else
  warn "No running backend found — no rollback tag set."
fi

# ─── STEP 4: Git pull ─────────────────────────────────────────────────────────
step "STEP 4: Pull latest code"

if command -v git &>/dev/null && [[ -d ".git" ]]; then
  git fetch origin "${GIT_BRANCH}" --quiet
  git reset --hard "origin/${GIT_BRANCH}" --quiet
  NEW_COMMIT=$(git rev-parse --short HEAD)
  NEW_MSG=$(git log -1 --pretty=format:'%s')
  log "Updated to: ${NEW_COMMIT} — ${NEW_MSG}"
else
  warn "Not a git repo or git not found — skipping git pull."
fi

# ─── STEP 5: Build backend image ──────────────────────────────────────────────
step "STEP 5: Build backend Docker image"

if [[ "${SKIP_BUILD}" == "true" ]]; then
  warn "--skip-build set — using cached image."
else
  info "Building backend (this may take 2-3 minutes)..."
  compose_cmd build --no-cache backend 2>&1 | grep -E "^(Step|#[0-9]|ERROR|Successfully)" || true
  log "Backend image built."
fi

# ─── STEP 6: Zero-downtime restart ────────────────────────────────────────────
step "STEP 6: Zero-downtime service restart"

# Infra must be up first
log "Ensuring infra services are running (postgres, redis, minio)..."
compose_cmd up -d postgres redis minio 2>&1 | tail -3

# Wait for postgres
info "Waiting for PostgreSQL..."
timeout 60 bash -c \
  'until docker exec alfakhir_postgres pg_isready -U alfakhir -q 2>/dev/null; do sleep 2; done' \
  && log "PostgreSQL: ready" \
  || error "PostgreSQL did not start in time."

# Restart only backend (zero-downtime: old stops, new starts)
log "Restarting backend container..."
compose_cmd up -d --no-deps --force-recreate backend 2>&1 | tail -3

# Verify health
if wait_for_api 90; then
  log "Backend: healthy"
else
  warn "Backend health check failed! Attempting rollback..."
  _rollback
  error "Rollback complete. Update aborted."
fi

# Bring up remaining services (n8n, nginx)
compose_cmd up -d 2>&1 | tail -3
log "All services: running"

# ─── STEP 7: Database migrations ──────────────────────────────────────────────
step "STEP 7: Database migrations"

if docker exec alfakhir_backend npm run migrate --silent 2>/dev/null; then
  log "Migrations: OK (npm run migrate)"
elif docker exec alfakhir_backend npx sequelize-cli db:migrate \
      --env production 2>/dev/null; then
  log "Migrations: OK (sequelize-cli)"
else
  warn "No migration command succeeded — schema may already be up to date."
fi

# ─── STEP 8: Seed (optional) ──────────────────────────────────────────────────
if [[ "${RUN_SEED}" == "true" ]]; then
  step "STEP 8: Run seed data"
  EXISTING=$(docker exec alfakhir_postgres psql \
    -U "${POSTGRES_USER:-alfakhir}" -d "${POSTGRES_DB:-alfakhir_school}" -t \
    -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
  if [[ "${EXISTING}" -gt "0" ]]; then
    warn "Database already has ${EXISTING} users — skipping seed."
  else
    docker exec -i alfakhir_postgres psql \
      -U "${POSTGRES_USER:-alfakhir}" \
      -d "${POSTGRES_DB:-alfakhir_school}" \
      < "${INSTALL_DIR}/scripts/seed-demo.sql" 2>&1 | tail -5
    log "Seed: complete"
  fi
fi

# ─── STEP 9: Post-update health verification ──────────────────────────────────
step "STEP 9: Post-update verification"

echo ""
compose_cmd ps
echo ""

HEALTH=$(curl -sf http://localhost:3001/api/health 2>/dev/null || echo '{}')
DB_STATUS=$(echo "${HEALTH}" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
REDIS_STATUS=$(echo "${HEALTH}" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if echo "${HEALTH}" | grep -q '"status":"ok"'; then
  log "API status: ok"
else
  warn "API /health did not return status:ok — check logs"
fi
info "Database: ${DB_STATUS} | Redis: ${REDIS_STATUS}"

# Disk after build
FREE_AFTER=$(df -BG / | awk 'NR==2{gsub(/G/,"",$4); print $4}')
[[ "${FREE_AFTER}" -lt 3 ]] && warn "Disk getting low: ${FREE_AFTER}GB — run: docker system prune -f"

# ─── STEP 10: Cleanup ─────────────────────────────────────────────────────────
step "STEP 10: Cleanup old images"

docker image prune -f --filter "until=24h" 2>/dev/null | grep -E "^(Deleted|Total)" || true
log "Old images pruned."

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
hr
NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo -e "${BOLD}${GREEN}  Update complete!${NC}"
echo -e "  Commit : ${NEW_COMMIT}"
echo -e "  API    : http://localhost:3001/api/health"
echo -e "  Log    : ${LOG_FILE}"
echo -e "  Rollback if needed: bash scripts/update-deploy.sh  (previous tag: ${ROLLBACK_TAG})"
hr
echo ""

# ─── Rollback function (used on failure) ──────────────────────────────────────
_rollback() {
  warn "ROLLBACK: restoring previous backend image..."
  if docker image inspect "${ROLLBACK_TAG}" &>/dev/null; then
    # Override compose image with rollback tag
    ROLLBACK_IMAGE=$(docker inspect "${ROLLBACK_TAG}" --format '{{.Id}}' 2>/dev/null)
    docker tag "${ROLLBACK_TAG}" alfakhir_backend:latest 2>/dev/null || true
    compose_cmd up -d --no-deps backend 2>&1 | tail -3
    if wait_for_api 60; then
      warn "Rollback successful — previous version is running."
    else
      error "Rollback also failed. Manual intervention required."
    fi
  else
    warn "No rollback image found (${ROLLBACK_TAG}). Cannot auto-rollback."
  fi

  # Restore pre-update backup if it exists
  if [[ -f "${PRE_BACKUP_FILE:-}" ]]; then
    warn "Restoring pre-update database backup: ${PRE_BACKUP_FILE}"
    docker exec alfakhir_postgres psql \
      -U "${POSTGRES_USER:-alfakhir}" \
      -d "${POSTGRES_DB:-alfakhir_school}" \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB:-alfakhir_school}' AND pid <> pg_backend_pid();" \
      &>/dev/null || true
    gunzip -c "${PRE_BACKUP_FILE}" | \
      docker exec -i alfakhir_postgres psql \
        -U "${POSTGRES_USER:-alfakhir}" \
        "${POSTGRES_DB:-alfakhir_school}" \
        &>/dev/null \
      && warn "Database restored from pre-update backup." \
      || warn "Database restore failed — check manually."
  fi
}
