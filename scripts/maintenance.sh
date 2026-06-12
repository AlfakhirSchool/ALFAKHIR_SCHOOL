#!/bin/bash
# Enable/disable maintenance mode
# Usage: bash scripts/maintenance.sh [on|off]

MODE=${1:-status}
NGINX_CONF="/home/Kali-Linux/al-fakhir/alfakhirchool/nginx/conf.d/maintenance.conf"
CONTAINER="alfakhir_nginx"

case "$MODE" in
  on)
    echo "Mengaktifkan maintenance mode..."
    cat > "$NGINX_CONF" << 'EOF'
# Maintenance mode - blocks all traffic except health check
geo $maintenance {
    default         1;
    127.0.0.1       0;
    # Tambahkan IP admin jika perlu: 203.x.x.x 0;
}

server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;

    if ($maintenance) {
        return 503;
    }

    error_page 503 /maintenance.html;
    location = /maintenance.html {
        root /etc/nginx/html;
        internal;
    }

    location /api/health {
        return 200 '{"status":"maintenance"}';
        add_header Content-Type application/json;
    }
}
EOF
    docker exec "$CONTAINER" nginx -s reload 2>/dev/null || echo "Nginx reload - cek manual"
    echo "✓ Maintenance mode ON"
    ;;

  off)
    echo "Menonaktifkan maintenance mode..."
    rm -f "$NGINX_CONF"
    docker exec "$CONTAINER" nginx -s reload 2>/dev/null || echo "Nginx reload - cek manual"
    echo "✓ Maintenance mode OFF"
    ;;

  status)
    if [[ -f "$NGINX_CONF" ]]; then
      echo "Maintenance mode: ON"
    else
      echo "Maintenance mode: OFF"
    fi
    ;;

  *)
    echo "Usage: $0 [on|off|status]"
    exit 1
    ;;
esac
