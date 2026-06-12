#!/bin/bash
# Al Fakhir School LMS - Production Deployment Script
# Jalankan di server: bash scripts/deploy.sh [primary|secondary]

set -euo pipefail

ROLE=${1:-primary}
PROJECT_DIR="/opt/alfakhir-school"
COMPOSE_FILE="docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

log "=== Al Fakhir School LMS Deploy ($ROLE) ==="

[[ ! -f ".env.production" ]] && error ".env.production tidak ditemukan!"
[[ -f ".env" ]] || cp .env.production .env

log "Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull --quiet

log "Building backend..."
docker-compose -f $COMPOSE_FILE build --no-cache backend

log "Stopping old containers..."
docker-compose -f $COMPOSE_FILE down --timeout 30

log "Starting database & cache first..."
docker-compose -f $COMPOSE_FILE up -d postgres redis
log "Waiting for postgres to be ready (max 60s)..."
timeout 60 bash -c 'until docker exec alfakhir_postgres pg_isready -U alfakhir; do sleep 2; done'

log "Running database migrations..."
docker-compose -f $COMPOSE_FILE run --rm backend npx sequelize-cli db:migrate --env production

log "Starting all services..."
docker-compose -f $COMPOSE_FILE up -d

log "Waiting for backend health check (max 60s)..."
timeout 60 bash -c 'until curl -sf http://localhost:3001/api/health; do sleep 3; done'

log "Cleaning up old images..."
docker image prune -f --filter "until=24h"

log ""
log "=== Deployment sukses! ==="
log "Backend:  http://localhost:3001/api"
log "MinIO:    http://localhost:9001"
log "N8N:      http://localhost:5678"
log ""
docker-compose -f $COMPOSE_FILE ps
