#!/usr/bin/env bash
# Jalankan semua frontend lokal — tidak ada yang menyentuh server prod
# Usage: ./dev-all.sh [start|stop|status]

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT/.dev-pids"
LOG="$ROOT/.dev-logs"
mkdir -p "$LOG"

APPS=(
  "frontend/web-admin:3000:Admin (Lama)"
  "frontend/web-guru:3002:Guru (Lama)"
  "frontend/web-portal:3004:Portal (Lama)"
  "frontend/sd/web-admin-sd:3010:Admin SD"
  "frontend/sd/web-guru-sd:3011:Guru SD"
  "frontend/sd/web-portal-sd:3012:Portal SD"
  "frontend/smp/web-admin-smp:3020:Admin SMP"
  "frontend/smp/web-guru-smp:3021:Guru SMP"
  "frontend/smp/web-portal-smp:3022:Portal SMP"
)

start_all() {
  echo "" > "$PIDFILE"
  for entry in "${APPS[@]}"; do
    dir="${entry%%:*}"; rest="${entry#*:}"; port="${rest%%:*}"; name="${rest#*:}"
    fulldir="$ROOT/$dir"
    logfile="$LOG/${dir//\//_}.log"

    # Kill existing on this port
    fuser -k "${port}/tcp" 2>/dev/null

    cd "$fulldir" || continue
    nohup npx next dev --port "$port" > "$logfile" 2>&1 &
    echo "$!" >> "$PIDFILE"
    echo "  ▶  $name  →  http://localhost:$port"
  done
  echo ""
  echo "Tunggu ~15 detik semua ready. Log ada di .dev-logs/"
  echo "Stop: ./dev-all.sh stop"
}

stop_all() {
  if [ -f "$PIDFILE" ]; then
    while read -r pid; do
      [ -n "$pid" ] && kill "$pid" 2>/dev/null
    done < "$PIDFILE"
    rm -f "$PIDFILE"
  fi
  # Kill by port juga sebagai fallback
  for entry in "${APPS[@]}"; do
    port="${entry#*:}"; port="${port%%:*}"
    fuser -k "${port}/tcp" 2>/dev/null
  done
  echo "Semua dev server dihentikan."
}

status_all() {
  echo ""
  printf "%-30s %-8s %s\n" "Nama" "Port" "Status"
  printf '%0.s─' {1..55}; echo
  for entry in "${APPS[@]}"; do
    dir="${entry%%:*}"; rest="${entry#*:}"; port="${rest%%:*}"; name="${rest#*:}"
    if fuser "${port}/tcp" &>/dev/null; then
      status="✓ running"
    else
      status="✗ mati"
    fi
    printf "%-30s %-8s %s\n" "$name" ":$port" "$status"
  done
  echo ""
}

case "${1:-start}" in
  start)  echo "Menjalankan semua dashboard lokal..."; echo ""; start_all ;;
  stop)   stop_all ;;
  status) status_all ;;
  *)      echo "Usage: $0 [start|stop|status]" ;;
esac
