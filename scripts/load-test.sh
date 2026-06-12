#!/bin/bash
# Al Fakhir School LMS - Load Testing Script (curl-based, no external tools required)
# Usage: bash scripts/load-test.sh [light|medium|heavy|soak] [BASE_URL]

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
warn()  { echo -e "${YELLOW}[$(ts)] $1${NC}"; }
error() { echo -e "${RED}[$(ts)] ERROR: $1${NC}" >&2; exit 1; }
info()  { echo -e "${CYAN}[$(ts)] $1${NC}"; }

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
PROFILE="${1:-light}"
BASE_URL="${2:-http://localhost:3001/api}"

# ---------------------------------------------------------------------------
# Profile config
# ---------------------------------------------------------------------------
case "$PROFILE" in
  light)
    CONCURRENCY=10
    TOTAL_REQUESTS=100
    DURATION_SECS=0   # 0 = request-count based
    ;;
  medium)
    CONCURRENCY=25
    TOTAL_REQUESTS=500
    DURATION_SECS=0
    ;;
  heavy)
    CONCURRENCY=50
    TOTAL_REQUESTS=1000
    DURATION_SECS=0
    ;;
  soak)
    CONCURRENCY=10
    TOTAL_REQUESTS=0   # 0 = duration based
    DURATION_SECS=300  # 5 minutes
    ;;
  *)
    echo -e "${BOLD}Usage:${NC} bash load-test.sh [light|medium|heavy|soak] [BASE_URL]"
    echo ""
    echo "  light  - 10 concurrent, 100 requests"
    echo "  medium - 25 concurrent, 500 requests"
    echo "  heavy  - 50 concurrent, 1000 requests"
    echo "  soak   - 10 concurrent for 5 minutes"
    echo ""
    echo "  BASE_URL default: http://localhost:3001/api"
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Temporary work directory
# ---------------------------------------------------------------------------
TMPDIR_LT=$(mktemp -d /tmp/alfakhir-loadtest-XXXXXX)
RESULTS_FILE="${TMPDIR_LT}/results.tsv"  # <endpoint>\t<http_code>\t<time_ms>
AUTH_TOKEN_FILE="${TMPDIR_LT}/token"
ERRORS_FILE="${TMPDIR_LT}/errors"
touch "${RESULTS_FILE}" "${ERRORS_FILE}"

cleanup() {
  rm -rf "${TMPDIR_LT}"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Step 1: Obtain auth token
# ---------------------------------------------------------------------------
get_token() {
  info "Obtaining auth token from ${BASE_URL}/auth/login ..."
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
    --max-time 15 2>/dev/null) || error "Login request failed. Is the backend running at ${BASE_URL}?"

  local http_code body
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
    warn "Login returned HTTP ${http_code}. Continuing without auth token."
    echo "" > "${AUTH_TOKEN_FILE}"
    return
  fi

  # Try to extract token from common response shapes
  local token
  token=$(echo "$body" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || true)
  if [[ -z "$token" ]]; then
    token=$(echo "$body" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || true)
  fi

  if [[ -n "$token" ]]; then
    echo "$token" > "${AUTH_TOKEN_FILE}"
    log "Auth token obtained."
  else
    warn "Could not parse token from login response. Some endpoints may return 401."
    echo "" > "${AUTH_TOKEN_FILE}"
  fi
}

# ---------------------------------------------------------------------------
# Single request worker — writes "<endpoint>\t<http_code>\t<time_ms>" to results
# ---------------------------------------------------------------------------
do_request() {
  local endpoint="$1"
  local method="${2:-GET}"
  local url="${BASE_URL}${endpoint}"
  local token
  token=$(cat "${AUTH_TOKEN_FILE}" 2>/dev/null || echo "")

  local auth_header=""
  [[ -n "$token" ]] && auth_header="-H \"Authorization: Bearer ${token}\""

  local result
  result=$(eval curl -s -o /dev/null -w "%{http_code} %{time_total}" \
    -X "${method}" "${url}" \
    ${auth_header} \
    -H "Content-Type: application/json" \
    --max-time 10 2>/dev/null || echo "000 10.000")

  local http_code time_s
  http_code=$(echo "$result" | awk '{print $1}')
  time_s=$(echo "$result" | awk '{print $2}')
  # Convert to milliseconds (integer)
  local time_ms
  time_ms=$(awk "BEGIN {printf \"%d\", ${time_s} * 1000}" 2>/dev/null || echo "0")

  echo -e "${endpoint}\t${http_code}\t${time_ms}" >> "${RESULTS_FILE}"

  if [[ "$http_code" == "000" ]]; then
    echo "${endpoint} TIMEOUT/ERR" >> "${ERRORS_FILE}"
  fi
}
export -f do_request
export RESULTS_FILE ERRORS_FILE BASE_URL AUTH_TOKEN_FILE

# ---------------------------------------------------------------------------
# Endpoints to test (round-robin across requests)
# ---------------------------------------------------------------------------
ENDPOINTS=(
  "/health:GET"
  "/auth/login:POST"    # will count login attempts; real token already obtained
  "/siswa:GET"
  "/dashboard/admin:GET"
)

# ---------------------------------------------------------------------------
# Run a batch of requests with given concurrency
# ---------------------------------------------------------------------------
run_batch() {
  local total="$1"
  local concurrency="$2"
  local pids=()
  local launched=0
  local endpoint_count=${#ENDPOINTS[@]}

  info "Launching ${total} requests with concurrency=${concurrency}..."
  local progress_interval=$((total / 10))
  [[ $progress_interval -lt 1 ]] && progress_interval=1

  while [[ $launched -lt $total ]]; do
    # Wait if we've hit the concurrency limit
    while [[ ${#pids[@]} -ge $concurrency ]]; do
      local new_pids=()
      for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
          new_pids+=("$pid")
        fi
      done
      pids=("${new_pids[@]+"${new_pids[@]}"}")
      [[ ${#pids[@]} -ge $concurrency ]] && sleep 0.05
    done

    local ep_entry="${ENDPOINTS[$((launched % endpoint_count))]}"
    local ep_path="${ep_entry%%:*}"
    local ep_method="${ep_entry##*:}"

    do_request "${ep_path}" "${ep_method}" &
    pids+=($!)
    launched=$((launched + 1))

    if (( launched % progress_interval == 0 )); then
      echo -ne "\r  Progress: ${launched}/${total} requests sent..."
    fi
  done

  # Wait for all remaining background jobs
  wait "${pids[@]+"${pids[@]}"}" 2>/dev/null || true
  echo -e "\r  Progress: ${total}/${total} requests complete.   "
}

# ---------------------------------------------------------------------------
# Soak test: run for a fixed duration
# ---------------------------------------------------------------------------
run_soak() {
  local duration="$1"
  local concurrency="$2"
  local endpoint_count=${#ENDPOINTS[@]}
  local end_time=$(( $(date +%s) + duration ))
  local launched=0
  local pids=()

  info "Soak test: running for ${duration}s with concurrency=${concurrency}..."

  while [[ $(date +%s) -lt $end_time ]]; do
    while [[ ${#pids[@]} -ge $concurrency ]]; do
      local new_pids=()
      for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
          new_pids+=("$pid")
        fi
      done
      pids=("${new_pids[@]+"${new_pids[@]}"}")
      [[ ${#pids[@]} -ge $concurrency ]] && sleep 0.05
    done

    local ep_entry="${ENDPOINTS[$((launched % endpoint_count))]}"
    local ep_path="${ep_entry%%:*}"
    local ep_method="${ep_entry##*:}"

    do_request "${ep_path}" "${ep_method}" &
    pids+=($!)
    launched=$((launched + 1))

    local remaining=$(( end_time - $(date +%s) ))
    echo -ne "\r  Soak: ${launched} requests sent, ${remaining}s remaining...    "
  done

  wait "${pids[@]+"${pids[@]}"}" 2>/dev/null || true
  echo -e "\r  Soak complete: ${launched} total requests sent.              "
}

# ---------------------------------------------------------------------------
# Analyze results
# ---------------------------------------------------------------------------
analyze_results() {
  local total_requests
  total_requests=$(wc -l < "${RESULTS_FILE}" | tr -d ' ')

  if [[ "$total_requests" -eq 0 ]]; then
    error "No results collected. Something went wrong."
  fi

  local success=0
  local fail=0
  local sum_ms=0
  local times=()

  while IFS=$'\t' read -r endpoint http_code time_ms; do
    [[ -z "$time_ms" ]] && time_ms=0
    if [[ "$http_code" =~ ^[23] ]]; then
      success=$((success + 1))
    else
      fail=$((fail + 1))
    fi
    sum_ms=$((sum_ms + time_ms))
    times+=("$time_ms")
  done < "${RESULTS_FILE}"

  local avg_ms=0
  [[ $total_requests -gt 0 ]] && avg_ms=$(( sum_ms / total_requests ))

  # Sort for percentiles
  IFS=$'\n' sorted=($(printf '%s\n' "${times[@]}" | sort -n))
  unset IFS

  local n=${#sorted[@]}
  local p95_idx=$(( n * 95 / 100 ))
  local p99_idx=$(( n * 99 / 100 ))
  [[ $p95_idx -ge $n ]] && p95_idx=$(( n - 1 ))
  [[ $p99_idx -ge $n ]] && p99_idx=$(( n - 1 ))

  local p95_ms=${sorted[$p95_idx]:-0}
  local p99_ms=${sorted[$p99_idx]:-0}

  local success_rate=0
  [[ $total_requests -gt 0 ]] && success_rate=$(( success * 100 / total_requests ))

  # Requests per second
  local elapsed_s=$(( ELAPSED_END - ELAPSED_START ))
  [[ $elapsed_s -lt 1 ]] && elapsed_s=1
  local rps=$(( total_requests / elapsed_s ))

  # Color coding
  local avg_color
  if   [[ $avg_ms -lt 500 ]];  then avg_color="${GREEN}"
  elif [[ $avg_ms -lt 1000 ]]; then avg_color="${YELLOW}"
  else avg_color="${RED}"
  fi

  local p95_color
  if   [[ $p95_ms -lt 500 ]];  then p95_color="${GREEN}"
  elif [[ $p95_ms -lt 1000 ]]; then p95_color="${YELLOW}"
  else p95_color="${RED}"
  fi

  local p99_color
  if   [[ $p99_ms -lt 500 ]];  then p99_color="${GREEN}"
  elif [[ $p99_ms -lt 1000 ]]; then p99_color="${YELLOW}"
  else p99_color="${RED}"
  fi

  local sr_color
  if   [[ $success_rate -ge 95 ]]; then sr_color="${GREEN}"
  elif [[ $success_rate -ge 80 ]]; then sr_color="${YELLOW}"
  else sr_color="${RED}"
  fi

  echo ""
  echo -e "${BOLD}${CYAN}================================================================${NC}"
  echo -e "${BOLD}  Al Fakhir School LMS — Load Test Results${NC}"
  echo -e "${BOLD}  Profile: ${PROFILE} | Base URL: ${BASE_URL}${NC}"
  echo -e "${BOLD}${CYAN}================================================================${NC}"
  printf "  %-28s %s\n" "Total Requests:"    "${total_requests}"
  printf "  %-28s %s\n" "Successful (2xx/3xx):" "${success}"
  printf "  %-28s %s\n" "Failed:"            "${fail}"
  echo -e "  $(printf '%-28s' 'Success Rate:')  ${sr_color}${success_rate}%${NC}"
  echo -e "  $(printf '%-28s' 'Avg Response Time:')  ${avg_color}${avg_ms} ms${NC}"
  echo -e "  $(printf '%-28s' 'P95 Response Time:')  ${p95_color}${p95_ms} ms${NC}"
  echo -e "  $(printf '%-28s' 'P99 Response Time:')  ${p99_color}${p99_ms} ms${NC}"
  printf "  %-28s %s req/sec\n" "Throughput:" "${rps}"
  printf "  %-28s %s s\n" "Elapsed Time:" "${elapsed_s}"
  echo -e "${BOLD}${CYAN}----------------------------------------------------------------${NC}"

  # Per-endpoint breakdown
  echo -e "${BOLD}  Per-Endpoint Breakdown:${NC}"
  declare -A ep_count ep_sum ep_fail
  while IFS=$'\t' read -r endpoint http_code time_ms; do
    [[ -z "$time_ms" ]] && time_ms=0
    ep_count["$endpoint"]=$(( ${ep_count["$endpoint"]:-0} + 1 ))
    ep_sum["$endpoint"]=$(( ${ep_sum["$endpoint"]:-0} + time_ms ))
    if [[ ! "$http_code" =~ ^[23] ]]; then
      ep_fail["$endpoint"]=$(( ${ep_fail["$endpoint"]:-0} + 1 ))
    fi
  done < "${RESULTS_FILE}"

  for ep in "${!ep_count[@]}"; do
    local ec=${ep_count["$ep"]}
    local es=${ep_sum["$ep"]}
    local ef=${ep_fail["$ep"]:-0}
    local eavg=$(( es / ec ))
    local esr=$(( (ec - ef) * 100 / ec ))
    echo -e "    ${ep}: ${ec} reqs, avg ${eavg}ms, ${esr}% success"
  done

  echo -e "${BOLD}${CYAN}================================================================${NC}"
  echo ""

  # Legend
  echo -e "  ${GREEN}Green${NC} = Good (<500ms)   ${YELLOW}Yellow${NC} = Warn (<1000ms)   ${RED}Red${NC} = Fail (>=1000ms)"
  echo ""

  # Overall pass/fail
  if [[ $success_rate -ge 95 ]] && [[ $avg_ms -lt 1000 ]]; then
    log "OVERALL: PASS — system healthy under '${PROFILE}' load."
  elif [[ $success_rate -ge 80 ]]; then
    warn "OVERALL: WARN — degraded performance under '${PROFILE}' load."
  else
    echo -e "${RED}[$(ts)] OVERALL: FAIL — system under stress under '${PROFILE}' load.${NC}"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}================================================================${NC}"
echo -e "${BOLD}  Al Fakhir School LMS — Load Test${NC}"
echo -e "  Profile: ${BOLD}${PROFILE}${NC} | Target: ${BASE_URL}"
echo -e "${BOLD}${CYAN}================================================================${NC}"

get_token

ELAPSED_START=$(date +%s)

if [[ "$PROFILE" == "soak" ]]; then
  run_soak "${DURATION_SECS}" "${CONCURRENCY}"
else
  run_batch "${TOTAL_REQUESTS}" "${CONCURRENCY}"
fi

ELAPSED_END=$(date +%s)

analyze_results
