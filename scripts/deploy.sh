#!/bin/bash
# Al Fakhir School LMS - Production Deployment Script
# Usage: bash scripts/deploy.sh [deploy|rollback|status]

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
log()   { local m="[$(ts)] $1"; echo -e "${GREEN}${m}${NC}"; echo "${m}" >> "${DEPLOY_LOG}"; }
warn()  { local m="[$(ts)] WARN: $1"; echo -e "${YELLOW}${m}${NC}"; echo "${m}" >> "${DEPLOY_LOG}"; }
error() { local m="[$(ts)] ERROR: $1"; echo -e "${RED}${m}${NC}" >&2; echo "${m}" >> "${DEPLOY_LOG}"; exit 1; }
info()  { local m="[$(ts)] $1"; echo -e "${CYAN}${m}${NC}"; echo "${m}" >> "${DEPLOY_LOG}"; }
step()  { local m="[$(ts)] ==> $1"; echo -e "${BOLD}${CYAN}${m}${NC}"; echo "${m}" >> "${DEPLOY_LOG}"; }
hr()    { echo -e "${CYAN}$(printf '─%.0s' {1..70})${NC}"; }

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ACTION="${1:-deploy}"
INSTALL_DIR="${INSTALL_DIR:-/opt/alfakhir-school}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOG_DIR="${INSTALL_DIR}/logs"
DEPLOY_LOG="${LOG_DIR}/deploy.log"
MIN_DISK_GB=5
GIT_BRANCH="${GIT_BRANCH:-main}"

mkdir -p "${LOG_DIR}"

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
  echo -e "${BOLD}Usage:${NC}  bash deploy.sh [deploy|rollback|status]"
  echo ""
  echo "  deploy    - Full production deployment (default)"
  echo "  rollback  - Roll back to previous Docker image"
  echo "  status    - Show container statuses and health"
  echo ""
  exit 1
}

# ---------------------------------------------------------------------------
# Pre-deployment checks
# ---------------------------------------------------------------------------
pre_checks() {
  step "Running pre-deployment checks..."

  # .env exists
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    source "${INSTALL_DIR}/.env" 2>/dev/null || true
    log ".env found: ${INSTALL_DIR}/.env"
  elif [[ -f "$(pwd)/.env" ]]; then
    source "$(pwd)/.env" 2>/dev/null || true
    log ".env found: $(pwd)/.env"
  else
    error ".env file not found in ${INSTALL_DIR} or $(pwd). Aborting."
  fi

  # Docker is running
  docker info &>/dev/null || error "Docker is not running. Start Docker and retry."
  log "Docker is running."

  # Disk space check
  local free_gb
  free_gb=$(df -BG / 2>/dev/null | awk 'NR==2{gsub(/G/,"",$4); print $4}' || echo "0")
  if [[ "${free_gb}" -lt "${MIN_DISK_GB}" ]]; then
    error "Insufficient disk space: ${free_gb}GB free (minimum ${MIN_DISK_GB}GB required)."
  fi
  log "Disk space OK: ${free_gb}GB free."

  # Git available
  command -v git &>/dev/null || warn "git not found — skipping git pull."

  log "Pre-deployment checks passed."
}

# ---------------------------------------------------------------------------
# Tag current backend image for rollback
# ---------------------------------------------------------------------------
tag_for_rollback() {
  step "Tagging current backend image for rollback..."
  local current_image
  current_image=$(docker inspect alfakhir_backend \
    --format '{{.Config.Image}}' 2>/dev/null || echo "")
  if [[ -n "$current_image" ]]; then
    docker tag "${current_image}" "alfakhir_backend:rollback" 2>/dev/null \
      && log "Tagged ${current_image} as alfakhir_backend:rollback" \
      || warn "Could not tag image for rollback."
  else
    warn "No running backend container found; rollback tag not created."
  fi
}

# ---------------------------------------------------------------------------
# Git pull
# ---------------------------------------------------------------------------
git_pull() {
  if ! command -v git &>/dev/null; then
    warn "git not found. Skipping git pull."
    return
  fi
  step "Pulling latest from branch '${GIT_BRANCH}'..."
  git fetch origin "${GIT_BRANCH}" \
    && git reset --hard "origin/${GIT_BRANCH}" \
    && log "Code updated to: $(git rev-parse --short HEAD) $(git log -1 --pretty=format:'%s')" \
    || error "git pull failed."
}

# ---------------------------------------------------------------------------
# Build backend image
# ---------------------------------------------------------------------------
build_backend() {
  step "Building backend Docker image (--no-cache)..."
  compose_cmd build --no-cache backend \
    && log "Backend image built successfully." \
    || error "Backend build failed."
}

# ---------------------------------------------------------------------------
# Blue-green deployment
# ---------------------------------------------------------------------------
blue_green_deploy() {
  step "Starting blue-green deployment..."

  # Ensure infra (db, redis, minio) is up first
  log "Starting infrastructure services (postgres, redis, minio)..."
  compose_cmd up -d postgres redis minio

  log "Waiting for PostgreSQL to be ready (max 60s)..."
  timeout 60 bash -c \
    'until docker exec alfakhir_postgres pg_isready -U alfakhir 2>/dev/null; do sleep 2; done' \
    && log "PostgreSQL ready." \
    || error "PostgreSQL did not become ready in time."

  # Start new backend (will replace old container)
  log "Starting new backend container..."
  compose_cmd up -d --no-deps backend

  log "Waiting for new backend to be healthy (max 90s)..."
  local healthy=false
  local waited=0
  while [[ $waited -lt 90 ]]; do
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
      healthy=true
      break
    fi
    sleep 3
    waited=$((waited + 3))
  done

  if [[ "$healthy" == "false" ]]; then
    warn "New backend did not pass health check. Triggering rollback..."
    rollback
    error "Deployment failed. Rolled back to previous version."
  fi

  log "New backend is healthy. Bringing up remaining services..."
  compose_cmd up -d
  log "Blue-green deployment complete."
}

# ---------------------------------------------------------------------------
# Database migrations
# ---------------------------------------------------------------------------
run_migrations() {
  step "Running database migrations..."
  # Try npm run migrate first, fall back to sequelize-cli
  if docker exec alfakhir_backend npm run migrate --silent 2>/dev/null; then
    log "Migrations complete (npm run migrate)."
  elif docker exec alfakhir_backend npx sequelize-cli db:migrate --env production 2>/dev/null; then
    log "Migrations complete (sequelize-cli db:migrate)."
  else
    warn "Migration command did not succeed. Check database state manually."
  fi
}

# ---------------------------------------------------------------------------
# Seed check (skip if data exists)
# ---------------------------------------------------------------------------
seed_check() {
  step "Checking if seeding is needed..."
  local user_count
  user_count=$(docker exec alfakhir_postgres \
    psql -U "${POSTGRES_USER:-alfakhir}" -At \
    -c "SELECT COUNT(*) FROM users;" \
    "${POSTGRES_DB:-alfakhir_school}" 2>/dev/null || echo "")
  if [[ -z "$user_count" ]] || [[ "$user_count" -eq 0 ]]; then
    log "No users found. Running seeders..."
    docker exec alfakhir_backend npx sequelize-cli db:seed:all --env production 2>/dev/null \
      && log "Seed complete." \
      || warn "Seeder failed or not configured. Skipping."
  else
    log "Data already exists (${user_count} users). Skipping seed."
  fi
}

# ---------------------------------------------------------------------------
# Post-deployment health check summary
# ---------------------------------------------------------------------------
post_deploy_summary() {
  step "Post-deployment health check..."
  hr
  echo -e "${BOLD}  Service Status Summary${NC}"
  hr

  # API health
  local api_http
  api_http=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "000")
  local api_icon; [[ "$api_http" == "200" ]] && api_icon="${GREEN}OK${NC}" || api_icon="${RED}FAIL (HTTP ${api_http})${NC}"
  echo -e "  Backend API:   ${api_icon}"

  # Container statuses
  local containers=(alfakhir_backend alfakhir_postgres alfakhir_redis alfakhir_minio alfakhir_n8n alfakhir_nginx)
  for c in "${containers[@]}"; do
    local state
    state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "not found")
    local icon; [[ "$state" == "running" ]] && icon="${GREEN}running${NC}" || icon="${RED}${state}${NC}"
    printf "  %-28s %b\n" "${c}:" "$icon"
  done
  hr

  log "Deployment summary complete. Full log: ${DEPLOY_LOG}"
  echo ""
  echo -e "${BOLD}  Endpoints:${NC}"
  echo -e "  Backend API:  http://localhost:3001/api"
  echo -e "  MinIO:        http://localhost:9001"
  echo -e "  N8N:          http://localhost:5678"
  hr
}

# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------
rollback() {
  step "Rolling back to previous backend image..."
  if docker images alfakhir_backend:rollback --format "{{.ID}}" 2>/dev/null | grep -q .; then
    compose_cmd stop backend 2>/dev/null || true
    # Retag rollback as latest and restart
    docker tag alfakhir_backend:rollback alfakhir_backend:latest 2>/dev/null || true
    compose_cmd up -d --no-deps backend
    log "Rollback: backend restarted with previous image."
    log "Waiting for rollback backend to be healthy (max 60s)..."
    timeout 60 bash -c \
      'until curl -sf http://localhost:3001/api/health > /dev/null 2>&1; do sleep 3; done' \
      && log "Rollback backend is healthy." \
      || warn "Rollback backend not responding. Manual inspection required."
  else
    warn "No rollback image found (alfakhir_backend:rollback). Cannot roll back automatically."
    warn "Manually restore from backup or re-run the previous build."
  fi
}

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
show_status() {
  step "Current deployment status:"
  compose_cmd ps 2>/dev/null || \
    docker ps --filter "name=alfakhir" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  post_deploy_summary
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
log "=== Al Fakhir School LMS Deploy — Action: ${ACTION} ==="

case "$ACTION" in
  deploy)
    pre_checks
    tag_for_rollback
    git_pull
    build_backend
    blue_green_deploy
    run_migrations
    seed_check
    # Prune stale images
    log "Pruning old Docker images..."
    docker image prune -f --filter "until=24h" 2>/dev/null || true
    post_deploy_summary
    log "=== Deployment complete ==="
    ;;

  rollback)
    rollback
    ;;

  status)
    show_status
    ;;

  *)
    usage
    ;;
esac
