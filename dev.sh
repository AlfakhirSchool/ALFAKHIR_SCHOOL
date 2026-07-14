#!/bin/bash
# Helper script untuk local dev & deploy

CMD=${1:-help}

case $CMD in
  up)
    # Start semua service lokal (pakai Dockerfile prod)
    docker-compose -f docker-compose.local.yml up -d
    echo "✓ Stack lokal jalan:"
    echo "  Admin  → http://localhost:3000"
    echo "  Guru   → http://localhost:3002"
    echo "  API    → http://localhost:3001/api/health"
    ;;

  down)
    docker-compose -f docker-compose.local.yml down
    ;;

  build)
    # Build ulang service tertentu: ./dev.sh build backend
    SERVICE=${2:-}
    if [ -z "$SERVICE" ]; then
      docker-compose -f docker-compose.local.yml build
    else
      docker-compose -f docker-compose.local.yml build --no-cache $SERVICE
      docker-compose -f docker-compose.local.yml up -d --force-recreate $SERVICE
    fi
    ;;

  logs)
    # ./dev.sh logs backend
    SERVICE=${2:-backend}
    docker-compose -f docker-compose.local.yml logs -f $SERVICE
    ;;

  dev)
    # Mode dev cepat: DB di Docker, code berjalan native (hot reload)
    docker-compose up -d postgres redis
    echo "✓ DB lokal jalan (port 5433, redis 6380)"
    echo "  Jalankan: cd backend && npm run dev"
    echo "  Jalankan: cd web-admin && npm run dev"
    echo "  Jalankan: cd web-guru && npm run dev -- -p 3002"
    ;;

  deploy)
    # Push + deploy ke CT101
    # Pastikan sudah commit semua dulu
    UNCOMMITTED=$(git status --porcelain)
    if [ -n "$UNCOMMITTED" ]; then
      echo "❌ Ada file belum di-commit:"
      git status --short
      exit 1
    fi
    git push origin main
    echo "✓ Push ke GitHub selesai"
    echo ""
    echo "Jalankan di CT101:"
    echo "  cd ~/alfakhir"
    echo "  git pull"
    echo "  docker compose -f docker-compose.prod.yml build --no-cache \${@:2}"
    echo "  docker compose -f docker-compose.prod.yml up -d --force-recreate \${@:2}"
    ;;

  seed)
    # Seed akun test ke DB lokal
    docker-compose -f docker-compose.local.yml exec postgres psql -U alfakhir -d alfakhir_school -c "
      UPDATE users SET password_default = 'admin123'
      WHERE email LIKE '%alfakhirschool.sch.id' AND role IN ('admin','guru');
    "
    ;;

  *)
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start semua service (Docker, mirror prod)"
    echo "  down            Stop semua service"
    echo "  build [service] Build ulang service (backend/web-admin/web-guru)"
    echo "  logs [service]  Lihat log service"
    echo "  dev             Start DB saja, code native (hot reload)"
    echo "  deploy          Push ke GitHub + instruksi deploy CT101"
    echo "  seed            Seed akun test ke DB lokal"
    ;;
esac
