#!/bin/bash
# Al Fakhir School LMS - Comprehensive Health Check
# Run: bash scripts/health-check.sh
# Returns: 0 = all OK, 1 = some issues

set -uo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0; WARN=0

ok() { echo -e "${GREEN}  ✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}  ✗${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; ((WARN++)); }

check_container() {
  local name=$1
  if docker inspect "$name" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
    ok "Container $name: healthy"
  elif docker inspect "$name" --format '{{.State.Running}}' 2>/dev/null | grep -q "true"; then
    warn "Container $name: running (no healthcheck)"
  else
    fail "Container $name: NOT running"
  fi
}

echo ""
echo "=== Al Fakhir School LMS Health Check ==="
echo "Waktu: $(date '+%Y-%m-%d %H:%M:%S WIB')"
echo ""

echo "--- Docker Containers ---"
for svc in alfakhir_postgres alfakhir_redis alfakhir_minio alfakhir_n8n alfakhir_backend alfakhir_nginx; do
  check_container "$svc"
done

echo ""
echo "--- API Endpoints ---"
API_BASE="${API_URL:-http://localhost:3001/api}"

# Health check
HEALTH=$(curl -sf "${API_BASE}/health" 2>/dev/null)
if [[ $? -eq 0 ]] && echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "GET /api/health → ok"
else
  fail "GET /api/health → FAIL"
fi

# Check response time
RESP_TIME=$(curl -o /dev/null -s -w "%{time_total}" "${API_BASE}/health" 2>/dev/null)
if (( $(echo "$RESP_TIME < 0.5" | bc -l 2>/dev/null || echo 0) )); then
  ok "Response time: ${RESP_TIME}s (< 500ms)"
else
  warn "Response time: ${RESP_TIME}s (slow)"
fi

echo ""
echo "--- Disk Space ---"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [[ "$DISK_USAGE" -lt 70 ]]; then
  ok "Disk usage: ${DISK_USAGE}%"
elif [[ "$DISK_USAGE" -lt 85 ]]; then
  warn "Disk usage: ${DISK_USAGE}% (approaching limit)"
else
  fail "Disk usage: ${DISK_USAGE}% (CRITICAL)"
fi

echo ""
echo "--- Backup Status ---"
LAST_BACKUP=$(ls -t /opt/alfakhir-school/backups/postgres/*.sql.gz 2>/dev/null | head -1)
if [[ -n "$LAST_BACKUP" ]]; then
  BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))
  if [[ $BACKUP_AGE -lt 25 ]]; then
    ok "Last backup: ${BACKUP_AGE}h ago ($(basename $LAST_BACKUP))"
  else
    warn "Last backup: ${BACKUP_AGE}h ago (> 24h)"
  fi
else
  warn "No backup found in /opt/alfakhir-school/backups/postgres/"
fi

echo ""
echo "--- PostgreSQL Replication ---"
REPL=$(docker exec alfakhir_postgres psql -U alfakhir -t -c \
  "SELECT count(*) FROM pg_stat_replication;" 2>/dev/null | tr -d ' ')
if [[ "$REPL" -gt 0 ]] 2>/dev/null; then
  ok "Streaming replication: $REPL standby connected"
else
  warn "Replication: no standby connected (standalone mode)"
fi

echo ""
echo "--- SSL Certificates ---"
for domain in api.alfakhirschool.id n8n.alfakhirschool.id; do
  CERT="/etc/letsencrypt/live/${domain}/cert.pem"
  if [[ -f "$CERT" ]]; then
    DAYS_LEFT=$(( ( $(date -d "$(openssl x509 -enddate -noout -in $CERT | cut -d= -f2)" +%s) - $(date +%s) ) / 86400 ))
    if [[ $DAYS_LEFT -gt 30 ]]; then
      ok "SSL $domain: ${DAYS_LEFT} days left"
    elif [[ $DAYS_LEFT -gt 7 ]]; then
      warn "SSL $domain: only ${DAYS_LEFT} days left!"
    else
      fail "SSL $domain: CRITICAL ${DAYS_LEFT} days left!"
    fi
  else
    warn "SSL $domain: cert not found (check certbot)"
  fi
done

echo ""
echo "=========================================="
echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  ${YELLOW}WARN: $WARN${NC}"
echo "=========================================="
echo ""

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
