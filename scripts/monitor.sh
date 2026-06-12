#!/bin/bash
# Al Fakhir School LMS - Real-Time System Monitoring Dashboard
# Usage: bash scripts/monitor.sh [once|watch|report]

set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

ts()  { date '+%Y-%m-%d %H:%M:%S'; }
hr()  { echo -e "${CYAN}$(printf '─%.0s' {1..72})${NC}"; }

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
MODE="${1:-once}"
REFRESH_INTERVAL=10  # seconds for watch mode
API_URL="${API_URL:-http://localhost:3001/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  echo -e "${BOLD}Usage:${NC} bash monitor.sh [once|watch|report]"
  echo ""
  echo "  once    - Print one snapshot and exit"
  echo "  watch   - Refresh every ${REFRESH_INTERVAL}s (Ctrl+C to stop)"
  echo "  report  - Generate HTML report to /tmp/alfakhir-monitor-<date>.html"
  echo ""
  exit 1
}

# ---------------------------------------------------------------------------
# Threshold helpers: return color for a percentage value
# ---------------------------------------------------------------------------
pct_color() {
  local pct="${1:-0}"
  if   [[ $(echo "$pct < 60"  | bc -l 2>/dev/null || awk "BEGIN{print ($pct<60)?1:0}") -eq 1 ]]; then echo "${GREEN}"
  elif [[ $(echo "$pct < 85"  | bc -l 2>/dev/null || awk "BEGIN{print ($pct<85)?1:0}") -eq 1 ]]; then echo "${YELLOW}"
  else echo "${RED}"
  fi
}

# Draw a simple ASCII bar (max width 20 chars)
bar() {
  local pct="${1:-0}"
  local width=20
  local filled
  filled=$(awk "BEGIN{printf \"%d\", ($pct/100)*$width}" 2>/dev/null || echo "0")
  local empty=$(( width - filled ))
  printf "%s%s%s" "$(printf '█%.0s' $(seq 1 $filled 2>/dev/null || true))" \
                  "$(printf '░%.0s' $(seq 1 $empty  2>/dev/null || true))" ""
}

# ---------------------------------------------------------------------------
# Gather metrics
# ---------------------------------------------------------------------------

# CPU usage (system-wide %)
get_cpu() {
  local cpu
  cpu=$(top -bn1 2>/dev/null | grep "Cpu(s)" | \
    awk '{print 100 - $NF}' | tr -d '%' 2>/dev/null || \
    awk '/^cpu / {usage=100-$NF; print usage}' /proc/stat 2>/dev/null | head -1 || \
    echo "0")
  # Ensure numeric
  echo "${cpu%.*}" 2>/dev/null || echo "0"
}

# RAM usage in %
get_ram_pct() {
  local total used
  total=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
  used=$(free -m  2>/dev/null | awk '/^Mem:/{print $3}')
  awk "BEGIN{printf \"%d\", ($used/$total)*100}" 2>/dev/null || echo "0"
}

get_ram_info() {
  free -h 2>/dev/null | awk '/^Mem:/{printf "%s used / %s total", $3, $2}' || echo "N/A"
}

# Disk usage %
get_disk_pct() {
  df -h / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}' || echo "0"
}

get_disk_info() {
  df -h / 2>/dev/null | awk 'NR==2{printf "%s used / %s total (%s free)", $3, $2, $4}' || echo "N/A"
}

# API response time (ms)
get_api_response_ms() {
  local result
  result=$(curl -s -o /dev/null -w "%{time_total}" \
    "${API_URL}/health" --max-time 5 2>/dev/null || echo "0")
  awk "BEGIN{printf \"%d\", $result * 1000}" 2>/dev/null || echo "0"
}

# DB connection count
get_db_connections() {
  docker exec alfakhir_postgres \
    psql -U alfakhir -At -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "N/A"
}

# Redis memory usage
get_redis_memory() {
  docker exec alfakhir_redis \
    redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "N/A"
}

# System uptime
get_uptime() {
  uptime -p 2>/dev/null || uptime 2>/dev/null | awk '{print $3,$4}' | tr -d ',' || echo "N/A"
}

# Docker container stats (name, status, mem usage)
get_container_stats() {
  local containers=(
    alfakhir_backend
    alfakhir_postgres
    alfakhir_redis
    alfakhir_minio
    alfakhir_n8n
    alfakhir_nginx
  )
  for cname in "${containers[@]}"; do
    local state mem cpu_pct
    state=$(docker inspect -f '{{.State.Status}}' "$cname" 2>/dev/null || echo "not found")
    if [[ "$state" == "running" ]]; then
      # docker stats (one-shot, no streaming)
      read -r mem cpu_pct < <(
        docker stats --no-stream --format "{{.MemUsage}} {{.CPUPerc}}" "$cname" 2>/dev/null \
          | awk '{print $1, $3}' || echo "N/A N/A"
      )
      echo "${cname}|${GREEN}running${NC}|mem:${mem}|cpu:${cpu_pct}"
    else
      echo "${cname}|${RED}${state}${NC}|mem:N/A|cpu:N/A"
    fi
  done
}

# Recent error log lines from backend
get_recent_errors() {
  docker logs --tail 30 alfakhir_backend 2>&1 \
    | grep -iE "error|warn|exception|fatal" \
    | tail -5 2>/dev/null || echo "(none)"
}

# ---------------------------------------------------------------------------
# Render snapshot
# ---------------------------------------------------------------------------
render_snapshot() {
  local output_type="${1:-terminal}"  # terminal | html

  local cpu_pct ram_pct disk_pct api_ms db_conn redis_mem uptime_str
  cpu_pct=$(get_cpu)
  ram_pct=$(get_ram_pct)
  disk_pct=$(get_disk_pct)
  api_ms=$(get_api_response_ms)
  db_conn=$(get_db_connections)
  redis_mem=$(get_redis_memory)
  uptime_str=$(get_uptime)

  local ram_info disk_info
  ram_info=$(get_ram_info)
  disk_info=$(get_disk_info)

  local api_color
  if   [[ $api_ms -lt 300  ]]; then api_color="${GREEN}"
  elif [[ $api_ms -lt 1000 ]]; then api_color="${YELLOW}"
  else api_color="${RED}"
  fi

  if [[ "$output_type" == "terminal" ]]; then
    hr
    echo -e "${BOLD}  Al Fakhir School LMS — System Monitor    $(ts)${NC}"
    echo -e "  Uptime: ${uptime_str}"
    hr

    # CPU
    local c_color; c_color=$(pct_color "$cpu_pct")
    printf "  ${BOLD}%-12s${NC} ${c_color}%s${NC} ${c_color}%3d%%${NC}\n" \
      "CPU:" "$(bar $cpu_pct)" "$cpu_pct"

    # RAM
    local r_color; r_color=$(pct_color "$ram_pct")
    printf "  ${BOLD}%-12s${NC} ${r_color}%s${NC} ${r_color}%3d%%${NC}  (%s)\n" \
      "RAM:" "$(bar $ram_pct)" "$ram_pct" "$ram_info"

    # Disk
    local d_color; d_color=$(pct_color "$disk_pct")
    printf "  ${BOLD}%-12s${NC} ${d_color}%s${NC} ${d_color}%3d%%${NC}  (%s)\n" \
      "Disk (/):" "$(bar $disk_pct)" "$disk_pct" "$disk_info"

    echo ""
    hr
    echo -e "${BOLD}  Docker Containers${NC}"
    hr
    printf "  ${BOLD}%-32s %-20s %-16s %-12s${NC}\n" "Container" "Status" "Memory" "CPU"
    while IFS='|' read -r cname status mem cpu; do
      printf "  %-32s %-28b %-16s %-12s\n" "$cname" "$status" "$mem" "$cpu"
    done < <(get_container_stats)

    echo ""
    hr
    echo -e "${BOLD}  Services${NC}"
    hr
    echo -e "  API Response:     ${api_color}${api_ms} ms${NC}"
    echo -e "  DB Connections:   ${db_conn}"
    echo -e "  Redis Memory:     ${redis_mem}"

    echo ""
    hr
    echo -e "${BOLD}  Recent Backend Errors (last 5 lines matching error|warn)${NC}"
    hr
    get_recent_errors | while IFS= read -r line; do
      echo -e "  ${DIM}${line}${NC}"
    done
    hr
    echo ""
  fi
}

# ---------------------------------------------------------------------------
# Generate HTML report
# ---------------------------------------------------------------------------
render_html_report() {
  local report_path="/tmp/alfakhir-monitor-$(date +%Y%m%d_%H%M%S).html"

  local cpu_pct ram_pct disk_pct api_ms db_conn redis_mem uptime_str
  cpu_pct=$(get_cpu)
  ram_pct=$(get_ram_pct)
  disk_pct=$(get_disk_pct)
  api_ms=$(get_api_response_ms)
  db_conn=$(get_db_connections)
  redis_mem=$(get_redis_memory)
  uptime_str=$(get_uptime)
  local ram_info disk_info
  ram_info=$(get_ram_info)
  disk_info=$(get_disk_info)

  bar_color_css() {
    local pct="$1"
    if   [[ $(awk "BEGIN{print ($pct<60)?1:0}") -eq 1 ]]; then echo "#22c55e"
    elif [[ $(awk "BEGIN{print ($pct<85)?1:0}") -eq 1 ]]; then echo "#f59e0b"
    else echo "#ef4444"
    fi
  }

  local api_color_css
  if   [[ $api_ms -lt 300  ]]; then api_color_css="#22c55e"
  elif [[ $api_ms -lt 1000 ]]; then api_color_css="#f59e0b"
  else api_color_css="#ef4444"
  fi

  # Container rows
  local container_rows=""
  while IFS='|' read -r cname raw_status mem cpu; do
    local status_clean; status_clean=$(echo "$raw_status" | sed 's/\\\033\[[0-9;]*m//g; s/\\033\[[0-9;]*m//g' | tr -d '\033')
    local row_color="#22c55e"
    [[ "$status_clean" != "running" ]] && row_color="#ef4444"
    container_rows+="<tr><td>${cname}</td><td style='color:${row_color};font-weight:bold'>${status_clean}</td><td>${mem}</td><td>${cpu}</td></tr>"
  done < <(get_container_stats)

  # Error log
  local error_html=""
  while IFS= read -r line; do
    error_html+="<div class='log-line'>${line}</div>"
  done < <(get_recent_errors | head -20)

  cat > "${report_path}" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Al Fakhir School — Monitor Report $(ts)</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; }
    h1   { color: #38bdf8; margin-bottom: 4px; }
    .ts  { color: #64748b; font-size: 0.85em; margin-bottom: 24px; }
    .card { background: #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    h2   { color: #7dd3fc; margin: 0 0 16px; font-size: 1em; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric { display: flex; align-items: center; margin-bottom: 12px; gap: 12px; }
    .metric-label { width: 120px; color: #94a3b8; font-size: 0.9em; }
    .bar-bg { background: #334155; border-radius: 4px; height: 14px; flex: 1; max-width: 240px; }
    .bar-fill { height: 14px; border-radius: 4px; transition: width 0.3s; }
    .metric-value { font-weight: bold; min-width: 80px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
    th    { color: #94a3b8; text-align: left; padding: 6px 10px; border-bottom: 1px solid #334155; }
    td    { padding: 8px 10px; border-bottom: 1px solid #1e3a5f; }
    .log-line { font-family: monospace; font-size: 0.8em; color: #fbbf24; margin: 2px 0; word-break: break-all; }
    .none-msg  { color: #64748b; font-style: italic; }
    .kv { display: flex; gap: 16px; flex-wrap: wrap; }
    .kv-item { background: #0f172a; border-radius: 6px; padding: 10px 16px; }
    .kv-item .k { color: #94a3b8; font-size: 0.8em; margin-bottom: 4px; }
    .kv-item .v { font-size: 1.2em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Al Fakhir School LMS — Monitor Report</h1>
  <div class="ts">Generated: $(ts) &nbsp;|&nbsp; Uptime: ${uptime_str}</div>

  <div class="card">
    <h2>System Resources</h2>
    <div class="metric">
      <span class="metric-label">CPU</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${cpu_pct}%;background:$(bar_color_css $cpu_pct)"></div></div>
      <span class="metric-value" style="color:$(bar_color_css $cpu_pct)">${cpu_pct}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">RAM</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${ram_pct}%;background:$(bar_color_css $ram_pct)"></div></div>
      <span class="metric-value" style="color:$(bar_color_css $ram_pct)">${ram_pct}% &nbsp;<small style='color:#64748b'>${ram_info}</small></span>
    </div>
    <div class="metric">
      <span class="metric-label">Disk (/)</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${disk_pct}%;background:$(bar_color_css $disk_pct)"></div></div>
      <span class="metric-value" style="color:$(bar_color_css $disk_pct)">${disk_pct}% &nbsp;<small style='color:#64748b'>${disk_info}</small></span>
    </div>
  </div>

  <div class="card">
    <h2>Docker Containers</h2>
    <table>
      <thead><tr><th>Container</th><th>Status</th><th>Memory</th><th>CPU</th></tr></thead>
      <tbody>${container_rows}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>Services</h2>
    <div class="kv">
      <div class="kv-item">
        <div class="k">API Response</div>
        <div class="v" style="color:${api_color_css}">${api_ms} ms</div>
      </div>
      <div class="kv-item">
        <div class="k">DB Connections</div>
        <div class="v">${db_conn}</div>
      </div>
      <div class="kv-item">
        <div class="k">Redis Memory</div>
        <div class="v">${redis_mem}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Recent Backend Errors</h2>
    ${error_html:-<div class='none-msg'>No errors found.</div>}
  </div>
</body>
</html>
EOF

  echo "${report_path}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "$MODE" in
  once)
    render_snapshot terminal
    ;;

  watch)
    while true; do
      clear
      render_snapshot terminal
      echo -e "  ${DIM}Refreshing every ${REFRESH_INTERVAL}s — Ctrl+C to stop${NC}"
      sleep "${REFRESH_INTERVAL}"
    done
    ;;

  report)
    log "Collecting metrics..."
    report_file=$(render_html_report)
    log "HTML report generated: ${report_file}"
    echo ""
    info "Open with: xdg-open '${report_file}' or scp to your local machine."
    ;;

  *)
    usage
    ;;
esac
