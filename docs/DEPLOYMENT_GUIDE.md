# Al Fakhir School LMS — Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**GitHub:** https://github.com/AlfakhirSchool/ALFAKHIR_SCHOOL

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Docker Compose Services Explained](#3-docker-compose-services-explained)
4. [Deploying Updates](#4-deploying-updates)
5. [Rollback Procedure](#5-rollback-procedure)
6. [Blue-Green Deployment Concept](#6-blue-green-deployment-concept)
7. [Vercel Deployment (Web Dashboards)](#7-vercel-deployment-web-dashboards)
8. [CI/CD Pipeline Overview](#8-cicd-pipeline-overview)
9. [Production Checklist](#9-production-checklist)
10. [Port Reference Table](#10-port-reference-table)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Proxmox Host                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Ubuntu 24.04 VM                         │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │           Docker Network (alfakhir_net)      │    │   │
│  │  │                                              │    │   │
│  │  │  ┌─────────┐    ┌──────────┐               │    │   │
│  │  │  │  nginx  │────▶  backend │                │    │   │
│  │  │  │ :80/443 │    │  :3001   │                │    │   │
│  │  │  └────┬────┘    └────┬─────┘                │    │   │
│  │  │       │              │                       │    │   │
│  │  │  ┌────▼──────────────▼──────────────────┐  │    │   │
│  │  │  │  postgres  redis  minio   n8n         │  │    │   │
│  │  │  │  :5432     :6379  :9000   :5678       │  │    │   │
│  │  │  └──────────────────────────────────────┘  │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  UFW Firewall: allow 22, 80, 443 only                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
  Internet Clients            Vercel (CDN)
  - Mobile Apps               - web-admin.vercel.app
  - Web Browsers              - web-guru.vercel.app
  
  DNS:
  api.alfakhirschool.id    → <VM_IP>
  n8n.alfakhirschool.id    → <VM_IP>
  minio.alfakhirschool.id  → <VM_IP>
  admin.alfakhirschool.id  → Vercel
  guru.alfakhirschool.id   → Vercel
```

### Request Flow

```
Client → DNS → VM (nginx :443)
              │
              ├── api.alfakhirschool.id/api/*    → backend:3001
              ├── n8n.alfakhirschool.id/*        → n8n:5678
              └── minio.alfakhirschool.id/*      → minio:9001
```

### Data Flow

```
Mobile App (siswa/ortu)
  └── API call → backend → PostgreSQL (data)
                        → Redis (cache/session)
                        → MinIO (file uploads)
                        → N8N (webhook → FCM push)

Web Admin/Guru (Vercel)
  └── API call → backend (same as above)
```

---

## 2. Environment Variables Reference

Semua variabel disimpan di `~/alfakhir/.env` (production). File ini tidak boleh di-commit ke Git.

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Backend listen port | `3001` |
| `API_PREFIX` | Yes | API route prefix | `/api` |

### Database (PostgreSQL)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `POSTGRES_DB` | Yes | Database name | `alfakhir_school` |
| `POSTGRES_USER` | Yes | DB username | `alfakhir` |
| `POSTGRES_PASSWORD` | Yes | DB password (min 24 chars) | `SecureP@ss2025...` |
| `DATABASE_URL` | Yes | Full connection URL | `postgres://user:pass@postgres:5432/db` |

### Authentication (JWT)

| Variable | Required | Description | Note |
|----------|----------|-------------|------|
| `JWT_SECRET` | Yes | Access token secret (min 48 chars) | Generate: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (min 48 chars) | Must be different from JWT_SECRET |
| `JWT_EXPIRES_IN` | No | Access token expiry | Default: `24h` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry | Default: `7d` |

### Redis

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | Redis connection URL with password: `redis://:pass@redis:6379` |
| `REDIS_PASSWORD` | Yes | Redis auth password |

### MinIO Object Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `MINIO_ROOT_USER` | Yes | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | Yes | MinIO admin password |
| `MINIO_ENDPOINT` | Yes | MinIO host (`minio` in Docker) |
| `MINIO_PORT` | Yes | MinIO port (`9000`) |
| `MINIO_ACCESS_KEY` | Yes | Same as MINIO_ROOT_USER |
| `MINIO_SECRET_KEY` | Yes | Same as MINIO_ROOT_PASSWORD |
| `MINIO_BUCKET` | Yes | Bucket name (`alfakhir-files`) |

### N8N Automation

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_USER` | Yes | N8N basic auth username |
| `N8N_PASSWORD` | Yes | N8N basic auth password |
| `N8N_HOST` | Yes | N8N domain (`n8n.alfakhirschool.id`) |
| `N8N_DB` | Yes | N8N database name (`n8n`) |
| `N8N_WEBHOOK_URL` | Yes | Internal webhook URL (`http://n8n:5678/webhook`) |

### Firebase Cloud Messaging

| Variable | Required | Description |
|----------|----------|-------------|
| `FCM_SERVER_KEY` | Yes* | Firebase Server Key (Legacy) |
| `FIREBASE_PROJECT_ID` | Yes* | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes* | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes* | Firebase service account email |

*Wajib jika menggunakan push notifications.

### Frontend URLs (CORS)

| Variable | Required | Description |
|----------|----------|-------------|
| `FRONTEND_ADMIN_URL` | Yes | Admin dashboard URL (for CORS) |
| `FRONTEND_GURU_URL` | Yes | Guru dashboard URL (for CORS) |

### Payment Gateways (Opsional)

| Variable | Description |
|----------|-------------|
| `BCA_CLIENT_ID` | BCA API client ID |
| `BCA_CLIENT_SECRET` | BCA API client secret |
| `MANDIRI_CLIENT_KEY` | Mandiri client key |
| `MANDIRI_SERVER_KEY` | Mandiri server key |

### Email (SMTP)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username (email address) |
| `SMTP_PASSWORD` | SMTP app password |

### Backup (Backblaze B2)

| Variable | Description |
|----------|-------------|
| `B2_ACCOUNT_ID` | Backblaze B2 account ID |
| `B2_APPLICATION_KEY` | Backblaze B2 application key |
| `B2_BUCKET_NAME` | B2 bucket name (`alfakhir-backups`) |

---

## 3. Docker Compose Services Explained

Production compose file: `docker-compose.prod.yml`

### Service: postgres

```yaml
image: postgres:14-alpine
container_name: alfakhir_postgres
```

- PostgreSQL 14 (Alpine = smaller image)
- Data persisted in Docker volume `postgres_data`
- Only accessible at `127.0.0.1:5432` (not public)
- Memory limit: 2 GB
- Init SQL runs from `scripts/init.sql`
- Locale: `id_ID.UTF-8` (Bahasa Indonesia)

### Service: redis

```yaml
image: redis:7-alpine
container_name: alfakhir_redis
```

- Redis 7 (Alpine) dengan password auth
- `maxmemory 512mb` dengan `allkeys-lru` eviction policy
- Data persisted in volume `redis_data`
- Only accessible at `127.0.0.1:6379`

### Service: minio

```yaml
image: minio/minio:latest
container_name: alfakhir_minio
```

- MinIO object storage (S3-compatible)
- API port: 9000, Console port: 9001
- Data persisted in volume `minio_data`
- Accessible via https://minio.alfakhirschool.id (console)

### Service: n8n

```yaml
image: n8nio/n8n:latest
container_name: alfakhir_n8n
```

- N8N workflow automation engine
- Basic auth enabled (N8N_BASIC_AUTH_ACTIVE=true)
- Database: PostgreSQL (shared dengan alfakhir_school)
- Accessible via https://n8n.alfakhirschool.id
- Workflow files: volume `n8n_data`

### Service: backend

```yaml
build:
  context: ./backend
  dockerfile: Dockerfile
container_name: alfakhir_backend
```

- Express.js + TypeScript application
- Built from source code via Dockerfile
- Memory limit: 1 GB
- Healthcheck: `GET /api/health` every 30s
- Log rotation: 50MB per file, 5 files max
- Depends on: postgres (healthy), redis (healthy)

### Service: nginx

```yaml
image: nginx:alpine
container_name: alfakhir_nginx
```

- Reverse proxy + SSL termination
- Config: `nginx/nginx.conf`
- SSL certs mounted from `/etc/letsencrypt`
- Rate limiting:
  - General API: 30 requests/minute
  - Login endpoint: 5 requests/minute

---

## 4. Deploying Updates

### Standard Deployment (Recommended)

```bash
cd ~/alfakhir

# Pull latest code
git fetch origin
git pull origin main

# Run deploy script
bash scripts/deploy.sh
```

Deploy script (`scripts/deploy.sh`) melakukan:
1. Validasi `.env.production` ada
2. Pull latest Docker images
3. Build backend image terbaru
4. Stop containers lama (graceful, 30 detik timeout)
5. Start database dan cache
6. Jalankan database migrations
7. Start semua services
8. Health check (max 60 detik)
9. Cleanup old images

### Deploy dengan Downtime Minimum

```bash
cd ~/alfakhir

# 1. Pull code dan build image SEBELUM restart
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache backend

# 2. Jalankan migrations (tidak memerlukan restart)
docker compose -f docker-compose.prod.yml exec backend \
  npx sequelize-cli db:migrate

# 3. Restart backend saja (< 30 detik downtime)
docker compose -f docker-compose.prod.yml restart backend

# 4. Verifikasi
sleep 30 && curl -sf http://localhost:3001/api/health
```

### Deploy Hotfix (Emergency)

```bash
# Jika hanya perubahan backend kode (bukan database):
cd ~/alfakhir
git pull origin main
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## 5. Rollback Procedure

### Rollback Backend ke Versi Sebelumnya

```bash
# Lihat commit history
git log --oneline -10

# Rollback ke commit tertentu
git checkout <COMMIT_HASH>

# Rebuild dan deploy
docker compose -f ~/alfakhir/docker-compose.prod.yml build --no-cache backend
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d --no-deps backend

# Verifikasi
sleep 30 && curl -sf http://localhost:3001/api/health
```

### Rollback Database Migration

```bash
# Undo 1 migration terakhir
docker exec alfakhir_backend npx sequelize-cli db:migrate:undo

# Undo semua migrations (HATI-HATI: hapus semua data!)
docker exec alfakhir_backend npx sequelize-cli db:migrate:undo:all

# Cek status
docker exec alfakhir_backend npx sequelize-cli db:migrate:status
```

### Rollback Lengkap (Database + Code)

```bash
# 1. Stop backend
docker compose -f ~/alfakhir/docker-compose.prod.yml stop backend

# 2. Restore database dari backup sebelum deployment
bash ~/alfakhir/scripts/restore.sh postgres \
  ~/alfakhir/backups/postgres/pre_deploy_backup.sql.gz

# 3. Checkout kode lama
cd ~/alfakhir
git checkout <PREVIOUS_COMMIT_HASH>

# 4. Rebuild dan start
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml start backend
```

**Best Practice:** Selalu buat backup sebelum deploy:
```bash
bash ~/alfakhir/scripts/backup.sh full
# Backup akan tersimpan di: ~/alfakhir/backups/postgres/full_TIMESTAMP.sql.gz
```

---

## 6. Blue-Green Deployment Concept

Untuk zero-downtime deployment di masa depan (saat traffic sudah tinggi):

```
                    ┌─────────────────┐
Internet ──────────▶│     nginx       │
                    │  load balancer  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              │              ▼
    ┌─────────────────┐      │   ┌─────────────────┐
    │  backend-blue   │      │   │  backend-green  │
    │  (current live) │      │   │  (new version)  │
    └─────────────────┘      │   └─────────────────┘
              ▲              │
    Active ───┘              └─── Inactive (testing)
```

**Prosedur:**
1. Deploy versi baru ke `backend-green` (tidak live)
2. Test `backend-green` secara internal
3. Switch nginx untuk routing ke `backend-green`
4. Monitor error rate
5. Jika OK: retire `backend-blue`
6. Jika NOK: switch balik ke `backend-blue`

Implementasi saat ini masih single-container. Blue-green deployment bisa diimplementasikan ketika traffic sudah membutuhkan zero-downtime releases.

---

## 7. Vercel Deployment (Web Dashboards)

Lihat detail lengkap di [VERCEL_SETUP_GUIDE.md](./VERCEL_SETUP_GUIDE.md).

### Quick Reference

**web-admin** (Admin Dashboard):
- Repository path: `web-admin/`
- Framework: Next.js
- Region: `sin1` (Singapore)
- Build command: `npm run build`
- Key env var: `NEXT_PUBLIC_API_URL=https://api.alfakhirschool.id/api`

**web-guru** (Guru Dashboard):
- Repository path: `web-guru/`
- Framework: Next.js
- Region: `sin1` (Singapore)
- Build command: `npm run build`
- Key env var: `NEXT_PUBLIC_API_URL=https://api.alfakhirschool.id/api`

### Triggering Vercel Deployment

Vercel auto-deploys saat ada push ke branch `main`. Untuk manual redeploy:
1. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
2. Pilih project (web-admin atau web-guru)
3. Deployments → klik titik tiga (...) → Redeploy

---

## 8. CI/CD Pipeline Overview

Repository menggunakan GitHub Actions (file di `.github/workflows/`).

### Pipeline Flow

```
git push → GitHub → GitHub Actions Triggers:
                    │
                    ├── [PR] → Run tests, lint check
                    │
                    └── [Push to main] → 
                          ├── Build & test backend
                          ├── Notify server (jika webhook dikonfigurasi)
                          └── Vercel auto-deploy (web-admin, web-guru)
```

### Server Auto-Deploy (Pull-based)

Saat ini deploy ke server masih manual (pull-based). Cara setup auto-deploy via webhook:

```bash
# Di server, install webhook listener
# Atau gunakan N8N sebagai deployment webhook receiver
```

### Manual Trigger

```bash
# Trigger deploy manual dari developer machine
ssh ubuntu@<SERVER_IP> "cd ~/alfakhir && git pull && bash scripts/deploy.sh"
```

---

## 9. Production Checklist

Checklist ini harus diverifikasi sebelum go-live atau setelah major update.

### Infrastructure

- [ ] VM running Ubuntu 24.04, minimum 4 GB RAM, 40 GB disk
- [ ] Docker CE terinstall, versi >= 24
- [ ] UFW aktif: hanya allow 22, 80, 443
- [ ] Fail2ban aktif (protect SSH)
- [ ] Systemd service `alfakhir-school` enabled (auto-start)
- [ ] Cron jobs terdaftar di `/etc/cron.d/alfakhir-school`

### Application

- [ ] 6 container running dan healthy
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Login admin berhasil: `admin@alfakhirschool.id / Admin@1234`
- [ ] **GANTI password demo sebelum production!**
- [ ] Database migrations terbaru sudah dijalankan
- [ ] Demo seed data dibersihkan (jika bukan untuk demo)

### Security

- [ ] `.env` berisi secrets yang kuat (bukan placeholder)
- [ ] `.env` permissions: `chmod 600 .env`
- [ ] `.env` TIDAK ada di git repository
- [ ] JWT_SECRET dan JWT_REFRESH_SECRET berbeda dan minimum 48 karakter
- [ ] POSTGRES_PASSWORD minimum 24 karakter
- [ ] Default admin password sudah diganti
- [ ] CORS FRONTEND_ADMIN_URL dan FRONTEND_GURU_URL sudah benar

### SSL & Domains

- [ ] DNS records sudah benar untuk semua 3 domain
- [ ] SSL cert valid dan tidak akan expire dalam 30 hari
- [ ] HTTPS redirect berfungsi (HTTP → HTTPS)
- [ ] HSTS header aktif di nginx

### Backup

- [ ] Backup cron terdaftar dan berjalan
- [ ] Backup terakhir < 25 jam yang lalu
- [ ] Test restore dari backup berhasil (DR test)
- [ ] Backup off-site dikonfigurasi (Backblaze B2 jika tersedia)

### Monitoring

- [ ] Health check cron berjalan setiap 5 menit
- [ ] Alert email dikonfigurasi di alertmanager.yml
- [ ] Grafana/monitoring stack berjalan (jika diperlukan)

### N8N

- [ ] Semua 3 workflow sudah diimport dan aktif
- [ ] FCM_SERVER_KEY dikonfigurasi di .env
- [ ] Test payment notification berhasil dikirim

### Vercel

- [ ] web-admin ter-deploy dan dapat diakses
- [ ] web-guru ter-deploy dan dapat diakses
- [ ] NEXT_PUBLIC_API_URL mengarah ke production API

---

## 10. Port Reference Table

### External Ports (Accessible from Internet via nginx)

| Domain | Port | Protocol | Service |
|--------|------|----------|---------|
| api.alfakhirschool.id | 443 | HTTPS | Backend API |
| n8n.alfakhirschool.id | 443 | HTTPS | N8N Workflow |
| minio.alfakhirschool.id | 443 | HTTPS | MinIO Console |
| * | 80 | HTTP | Redirect to HTTPS |

### Internal Ports (Localhost Only, Not Public)

| Container | Host Port | Container Port | Service |
|-----------|-----------|----------------|---------|
| alfakhir_backend | 127.0.0.1:3001 | 3001 | Express.js API |
| alfakhir_postgres | 127.0.0.1:5432 | 5432 | PostgreSQL |
| alfakhir_redis | 127.0.0.1:6379 | 6379 | Redis |
| alfakhir_minio | 127.0.0.1:9000 | 9000 | MinIO API |
| alfakhir_minio | 127.0.0.1:9001 | 9001 | MinIO Console |
| alfakhir_n8n | 127.0.0.1:5678 | 5678 | N8N |

### Monitoring Ports (Jika Monitoring Stack Aktif)

| Container | Host Port | Service |
|-----------|-----------|---------|
| alfakhir_prometheus | 127.0.0.1:9090 | Prometheus |
| alfakhir_grafana | 127.0.0.1:3100 | Grafana |
| alfakhir_node_exporter | 127.0.0.1:9100 | Node Exporter |
| alfakhir_postgres_exporter | 127.0.0.1:9187 | Postgres Exporter |
| alfakhir_alertmanager | 127.0.0.1:9093 | AlertManager |

### Development Ports (docker-compose.yml, bukan prod)

| Container | Host Port | Notes |
|-----------|-----------|-------|
| alfakhir-postgres | 5433 | Hindari konflik dengan native postgres |
| alfakhir-redis | 6380 | Hindari konflik dengan native redis |
| alfakhir-backend | 3001 | Sama dengan production |
