# Al Fakhir School LMS — Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13

---

## Quick Reference: Diagnosis Commands

```bash
# Status semua container
docker ps -a --format "table {{.Names}}\t{{.Status}}"

# Health check lengkap
bash ~/alfakhir/scripts/health-check.sh

# Lihat log backend terbaru
docker logs alfakhir_backend --tail 50 -f

# Lihat log semua container
docker compose -f ~/alfakhir/docker-compose.prod.yml logs --tail 20
```

---

## Table of Contents

1. [Container Won't Start](#1-container-wont-start)
2. [Database Connection Errors](#2-database-connection-errors)
3. [Backend 500 Errors](#3-backend-500-errors)
4. [Redis Connection Issues](#4-redis-connection-issues)
5. [MinIO Storage Errors](#5-minio-storage-errors)
6. [N8N Workflow Failures](#6-n8n-workflow-failures)
7. [SSL Certificate Issues](#7-ssl-certificate-issues)
8. [High Memory / CPU Usage](#8-high-memory--cpu-usage)
9. [Slow API Responses](#9-slow-api-responses)
10. [Login Failures / JWT Issues](#10-login-failures--jwt-issues)
11. [FCM Notification Not Sending](#11-fcm-notification-not-sending)
12. [Backup Failures](#12-backup-failures)
13. [Docker Daemon Issues](#13-docker-daemon-issues)

---

## 1. Container Won't Start

### Symptom A: Container exits immediately

```
alfakhir_backend   Exited (1) 3 seconds ago
```

**Diagnosis:**
```bash
# Lihat exit reason
docker logs alfakhir_backend --tail 100

# Inspect container state
docker inspect alfakhir_backend --format '{{.State.ExitCode}} {{.State.Error}}'
```

**Fix — Environment variable missing:**
```bash
# Pastikan .env ada dan berisi semua variabel
cat ~/alfakhir/.env

# Jika .env hilang, re-generate dari template
cp ~/alfakhir/.env.production ~/alfakhir/.env
# Edit dan isi semua placeholder GANTI_... dengan nilai nyata
nano ~/alfakhir/.env

# Restart
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d backend
```

**Fix — Port conflict:**
```bash
# Cek port yang dipakai
sudo ss -tlnp | grep -E '3001|5432|6379|9000|5678'

# Matikan proses yang konflik
sudo fuser -k 3001/tcp 2>/dev/null || true
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d
```

### Symptom B: Container restart loop

```
alfakhir_backend   Restarting (1) 5 seconds ago
```

**Diagnosis:**
```bash
# Lihat log terakhir sebelum restart
docker logs alfakhir_backend --tail 50

# Cek healthcheck
docker inspect alfakhir_backend --format '{{json .State.Health}}' | jq .
```

**Fix — Backend menunggu postgres:**
```bash
# Cek apakah postgres healthy dulu
docker inspect alfakhir_postgres --format '{{.State.Health.Status}}'

# Jika postgres belum healthy, tunggu atau restart postgres dulu
docker compose -f ~/alfakhir/docker-compose.prod.yml restart postgres
sleep 30
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Symptom C: Container tidak ada (tidak muncul di `docker ps -a`)

**Diagnosis:**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml config --services
docker compose -f ~/alfakhir/docker-compose.prod.yml ps -a
```

**Fix:**
```bash
cd ~/alfakhir
docker compose -f docker-compose.prod.yml up -d
```

---

## 2. Database Connection Errors

### Symptom: `ECONNREFUSED 5432`

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**
```bash
# Cek apakah postgres container running
docker ps | grep postgres

# Cek log postgres
docker logs alfakhir_postgres --tail 30

# Test koneksi dari backend container
docker exec alfakhir_backend sh -c "nc -zv postgres 5432"
```

**Fix — Postgres container down:**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d postgres

# Tunggu healthy
until docker exec alfakhir_postgres pg_isready -U alfakhir -d alfakhir_school; do sleep 2; done

docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

**Fix — Wrong DB_HOST:**
```bash
# Dalam docker network, host harus "postgres" (nama service), bukan "localhost"
grep DB_HOST ~/alfakhir/.env
# Harus: DB_HOST=postgres (production) atau localhost (jika pakai DATABASE_URL)
```

### Symptom: `password authentication failed`

```
Error: password authentication failed for user "alfakhir"
```

**Diagnosis:**
```bash
# Cek password di .env
grep POSTGRES_PASSWORD ~/alfakhir/.env

# Test koneksi manual
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c "SELECT 1;"
```

**Fix:**
```bash
# Jika password berbeda antara .env dan yang tersimpan di volume
# Reset postgres password
docker exec alfakhir_postgres psql -U postgres -c \
  "ALTER USER alfakhir PASSWORD 'new_password_sesuai_env';"
```

### Symptom: `database "alfakhir_school" does not exist`

**Fix:**
```bash
docker exec alfakhir_postgres psql -U alfakhir -c \
  "CREATE DATABASE alfakhir_school OWNER alfakhir;"

# Jalankan migration
docker exec alfakhir_backend npx sequelize-cli db:migrate
```

### Symptom: Too many connections

```
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**Diagnosis:**
```bash
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Fix:**
```bash
# Terminate idle connections
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# Restart backend untuk reset connection pool
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

---

## 3. Backend 500 Errors

### Symptom: API returns HTTP 500

```json
{"status":"error","message":"Internal Server Error"}
```

**Diagnosis:**
```bash
# Log backend real-time
docker logs alfakhir_backend --tail 100 -f

# Cek log file
tail -f ~/alfakhir/logs/combined.log 2>/dev/null || true
tail -f ~/alfakhir/logs/error.log 2>/dev/null || true
```

**Fix — Database migration belum dijalankan:**
```bash
# Lihat status migrations
docker exec alfakhir_backend npx sequelize-cli db:migrate:status

# Jalankan pending migrations
docker exec alfakhir_backend npx sequelize-cli db:migrate
```

**Fix — Sequelize model error:**
```bash
# Lihat log detail error
docker logs alfakhir_backend 2>&1 | grep -i "sequelize\|error" | tail -30

# Jika ada column yang hilang, cek schema
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c "\d users"
```

**Fix — Unhandled exception:**
```bash
# Restart backend
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

---

## 4. Redis Connection Issues

### Symptom: `ECONNREFUSED redis:6379`

```
ReplyError: NOAUTH Authentication required
```

**Diagnosis:**
```bash
# Cek redis container
docker ps | grep redis
docker logs alfakhir_redis --tail 30

# Test koneksi redis
docker exec alfakhir_redis redis-cli -a "${REDIS_PASSWORD}" ping
```

**Fix — Password mismatch:**
```bash
# Ambil REDIS_PASSWORD dari .env
REDIS_PASS=$(grep REDIS_PASSWORD ~/alfakhir/.env | cut -d= -f2)

# Test dengan password
docker exec alfakhir_redis redis-cli -a "$REDIS_PASS" ping
# Expected: PONG

# Pastikan REDIS_URL di .env menggunakan password
grep REDIS_URL ~/alfakhir/.env
# Harus: redis://:${REDIS_PASSWORD}@redis:6379
```

**Fix — Redis container crash:**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d redis
sleep 5
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Symptom: Redis memory full (OOM)

```
OOM command not allowed when used memory > 'maxmemory'
```

**Diagnosis:**
```bash
REDIS_PASS=$(grep REDIS_PASSWORD ~/alfakhir/.env | cut -d= -f2)
docker exec alfakhir_redis redis-cli -a "$REDIS_PASS" info memory | grep used_memory_human
```

**Fix:**
```bash
# Flush semua cache (tidak menghapus data penting)
docker exec alfakhir_redis redis-cli -a "$REDIS_PASS" FLUSHDB

# Atau restart redis (data cache akan hilang tapi session juga hilang!)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart redis
```

---

## 5. MinIO Storage Errors

### Symptom: Upload file gagal

```
Error: MinIO connection refused
```

**Diagnosis:**
```bash
# Cek MinIO container
docker ps | grep minio
docker logs alfakhir_minio --tail 30

# Test MinIO health
curl -sf http://localhost:9000/minio/health/live && echo "MinIO OK"
```

**Fix — MinIO container down:**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d minio
sleep 10

# Verifikasi
curl -sf http://localhost:9000/minio/health/live
```

**Fix — Bucket belum ada:**
```bash
# Masuk MinIO console: https://minio.alfakhirschool.id
# Login dengan MINIO_ROOT_USER dan MINIO_ROOT_PASSWORD dari .env
# Buat bucket: alfakhir-files

# Atau via CLI:
MINIO_PASS=$(grep MINIO_ROOT_PASSWORD ~/alfakhir/.env | cut -d= -f2)
docker run --rm --network alfakhir_net \
  -e MC_HOST_minio="http://alfakhir:${MINIO_PASS}@minio:9000" \
  minio/mc mb minio/alfakhir-files
```

### Symptom: MinIO disk full

**Diagnosis:**
```bash
df -h /var/lib/docker/volumes/alfakhir_minio_data/
```

**Fix:**
```bash
# Login MinIO console dan hapus file lama
# Atau: cleanup files lama via mc CLI
MINIO_PASS=$(grep MINIO_ROOT_PASSWORD ~/alfakhir/.env | cut -d= -f2)
docker run --rm --network alfakhir_net \
  -e MC_HOST_minio="http://alfakhir:${MINIO_PASS}@minio:9000" \
  minio/mc find minio/alfakhir-files --older-than 90d --exec "mc rm {}"
```

---

## 6. N8N Workflow Failures

### Symptom: Webhook tidak menerima request dari backend

**Diagnosis:**
```bash
# Cek N8N container
docker logs alfakhir_n8n --tail 50

# Test webhook endpoint
curl -s -X POST https://n8n.alfakhirschool.id/webhook/payment-created \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Fix — N8N container down:**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d n8n
sleep 15
```

**Fix — Workflow tidak aktif:**
1. Buka https://n8n.alfakhirschool.id
2. Login dengan credentials dari `.env` (`N8N_USER` / `N8N_PASSWORD`)
3. Klik workflow yang bermasalah
4. Pastikan toggle **Active** di kanan atas = ON (hijau)

**Fix — Webhook URL salah di backend .env:**
```bash
grep N8N_WEBHOOK_URL ~/alfakhir/.env
# Harus: N8N_WEBHOOK_URL=http://n8n:5678/webhook
# (bukan https karena internal docker network)
```

### Symptom: FCM notification tidak dikirim dari N8N

**Diagnosis:**
Di N8N workflow editor:
1. Buka execution history
2. Klik eksekusi yang gagal
3. Lihat node "Send FCM Notification" — expand untuk lihat request/response

**Fix — FCM_SERVER_KEY belum diset:**
```bash
grep FCM_SERVER_KEY ~/alfakhir/.env
# Jika kosong, isi dengan server key dari Firebase Console
```

---

## 7. SSL Certificate Issues

### Symptom: SSL certificate expired

```
SSL_ERROR_RX_RECORD_TOO_LONG
```

**Diagnosis:**
```bash
# Cek expiry tanggal
for domain in api.alfakhirschool.id n8n.alfakhirschool.id minio.alfakhirschool.id; do
  echo -n "$domain: "
  openssl s_client -connect ${domain}:443 -servername ${domain} </dev/null 2>/dev/null \
    | openssl x509 -noout -enddate
done
```

**Fix — Manual renewal:**
```bash
# Stop nginx sementara
docker compose -f ~/alfakhir/docker-compose.prod.yml stop nginx

# Renew
sudo certbot renew --force-renewal

# Restart nginx
docker compose -f ~/alfakhir/docker-compose.prod.yml start nginx
```

### Symptom: Nginx SSL handshake error

```
[error] SSL_do_handshake() failed (SSL: error:...) while SSL handshaking
```

**Diagnosis:**
```bash
docker logs alfakhir_nginx --tail 30 | grep -i ssl
ls -la /etc/letsencrypt/live/
```

**Fix — Cert file path salah:**
```bash
# Verify cert files exist
ls /etc/letsencrypt/live/api.alfakhirschool.id/
# Harus ada: cert.pem, chain.pem, fullchain.pem, privkey.pem

# Reload nginx
docker exec alfakhir_nginx nginx -s reload
```

### Symptom: `certbot: domain not reachable`

**Fix:**
```bash
# Pastikan port 80 terbuka dan tidak diblock oleh container
sudo ufw allow 80/tcp

# Test dari internet
curl -v http://api.alfakhirschool.id/

# Jika nginx sudah jalan dan mengarah ke backend, hentikan dulu nginx
docker compose -f ~/alfakhir/docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d api.alfakhirschool.id
docker compose -f ~/alfakhir/docker-compose.prod.yml start nginx
```

---

## 8. High Memory / CPU Usage

### Symptom: Server lambat / swap full

**Diagnosis:**
```bash
# Lihat resource usage per container
docker stats --no-stream

# Top processes
htop

# Memory detail
free -h
```

**Fix — Backend memory leak:**
```bash
# Restart backend untuk free memory
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend

# Cek memory limit di compose
grep -A5 "resources:" ~/alfakhir/docker-compose.prod.yml
```

**Fix — PostgreSQL memory tinggi:**
```bash
# Cek slow queries
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT pid, now() - query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' AND query_start < now() - interval '1 minute'
   ORDER BY duration DESC;"

# Kill query lama
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state != 'idle' AND query_start < now() - interval '5 minutes';"
```

**Fix — Disk I/O tinggi:**
```bash
# Cek I/O per container
docker stats --format "{{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}}" --no-stream

# Cleanup Docker log files yang besar
docker system df
find /var/lib/docker/containers -name "*.log" -size +100M -exec ls -lh {} \;
```

---

## 9. Slow API Responses

### Symptom: Response time > 2 detik

**Diagnosis:**
```bash
# Test response time
curl -o /dev/null -s -w "Total: %{time_total}s\n" https://api.alfakhirschool.id/api/health

# Cek slow database queries
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT query, calls, total_exec_time/calls AS avg_ms, rows
   FROM pg_stat_statements
   ORDER BY avg_ms DESC
   LIMIT 10;"
```

**Fix — Missing database indexes:**
```bash
# Cek query plans untuk endpoint lambat
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "EXPLAIN ANALYZE SELECT * FROM siswa WHERE kelas_id = 'some-uuid';"
```

**Fix — Redis cache tidak berfungsi:**
```bash
REDIS_PASS=$(grep REDIS_PASSWORD ~/alfakhir/.env | cut -d= -f2)
docker exec alfakhir_redis redis-cli -a "$REDIS_PASS" info stats | grep keyspace_hits
# Ratio keyspace_hits/(keyspace_hits + keyspace_misses) harus > 70%
```

**Fix — Restart backend (free memory / clear leaks):**
```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

---

## 10. Login Failures / JWT Issues

### Symptom: Login selalu gagal — `Invalid credentials`

**Diagnosis:**
```bash
# Test login langsung ke backend (bypass nginx)
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' | jq .

# Cek apakah user ada di database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT id, email, role, is_active FROM users WHERE email = 'admin@alfakhirschool.id';"
```

**Fix — User tidak aktif:**
```bash
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "UPDATE users SET is_active = true WHERE email = 'admin@alfakhirschool.id';"
```

**Fix — Password reset admin:**
```bash
# Generate bcrypt hash untuk password baru (gunakan Node.js)
docker exec alfakhir_backend node -e "
  const bcrypt = require('bcryptjs');
  bcrypt.hash('Admin@1234', 12, (err, hash) => console.log(hash));
"

# Update di database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "UPDATE users SET password = '<HASH_DI_ATAS>' WHERE email = 'admin@alfakhirschool.id';"
```

### Symptom: `jwt expired` atau `invalid signature`

**Diagnosis:**
```bash
grep JWT_SECRET ~/alfakhir/.env
```

**Fix — JWT_SECRET berubah (semua token lama invalid):**
```bash
# Ini normal jika .env di-regenerate
# Pengguna perlu login ulang. Beri notifikasi.

# Jika JWT_SECRET tidak sengaja berubah, restore dari backup .env
```

### Symptom: Token tidak diterima di endpoint tertentu

**Diagnosis:**
```bash
# Test dengan token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/dashboard | jq .
```

**Fix — Role tidak memiliki akses:**
- Periksa dokumentasi RBAC di API_DOCUMENTATION.md
- Endpoint tertentu hanya bisa diakses oleh role `admin`

---

## 11. FCM Notification Not Sending

### Symptom: Push notification tidak sampai ke HP

**Diagnosis:**
```bash
# Cek FCM_SERVER_KEY di .env
grep FCM_SERVER_KEY ~/alfakhir/.env

# Test kirim FCM manual
FCM_KEY=$(grep FCM_SERVER_KEY ~/alfakhir/.env | cut -d= -f2)
curl -s -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=${FCM_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "GANTI_FCM_TOKEN_DEVICE",
    "notification": {
      "title": "Test",
      "body": "Test notification dari server"
    }
  }' | jq .
```

**Fix — FCM Server Key expired atau salah:**
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project Al Fakhir School
3. Settings → Cloud Messaging → Legacy server key
4. Copy dan update di `.env`: `FCM_SERVER_KEY=<new_key>`
5. Restart backend:
   ```bash
   docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
   ```

**Fix — FCM token user tidak tersimpan:**
```bash
# Cek apakah FCM token tersimpan di database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT id, email, fcm_token FROM users WHERE fcm_token IS NOT NULL LIMIT 5;"
```

---

## 12. Backup Failures

### Symptom: Backup cron tidak berjalan

**Diagnosis:**
```bash
# Cek cron log
tail -50 ~/alfakhir/logs/backup.log

# Cek apakah cron berjalan
sudo systemctl status cron
sudo journalctl -u cron --since "1 day ago" | grep alfakhir
```

**Fix:**
```bash
# Jalankan backup manual untuk test
bash ~/alfakhir/scripts/backup.sh daily

# Cek output
echo $?  # 0 = sukses
```

### Symptom: `pg_dump failed`

**Diagnosis:**
```bash
docker exec alfakhir_postgres pg_dump -U alfakhir alfakhir_school > /dev/null 2>&1
echo "Exit code: $?"
```

**Fix:**
```bash
# Pastikan postgres container running
docker ps | grep postgres

# Pastikan disk tidak penuh
df -h ~/alfakhir/backups/
```

### Symptom: Backup berhasil tapi file kecil / corrupt

**Diagnosis:**
```bash
# Cek ukuran backup
ls -lh ~/alfakhir/backups/postgres/

# Verifikasi isi backup
BACKUP=$(ls -t ~/alfakhir/backups/postgres/*.sql.gz | head -1)
gunzip -t "$BACKUP" && echo "OK" || echo "CORRUPT"
```

---

## 13. Docker Daemon Issues

### Symptom: `Cannot connect to the Docker daemon`

**Diagnosis:**
```bash
sudo systemctl status docker
sudo journalctl -u docker --since "30 minutes ago"
```

**Fix:**
```bash
sudo systemctl restart docker
sleep 5
docker ps
```

### Symptom: Docker disk usage penuh

**Diagnosis:**
```bash
docker system df
df -h /var/lib/docker
```

**Fix:**
```bash
# Hapus data yang tidak dipakai
docker system prune -f

# Hapus images lama (hati-hati)
docker image prune -af --filter "until=72h"

# Hapus volumes orphan
docker volume prune -f
```

### Symptom: Container tidak bisa connect ke internet (saat build)

**Diagnosis:**
```bash
docker run --rm alpine ping -c 3 8.8.8.8
docker run --rm alpine wget -q -O - https://registry-1.docker.io/v2/ 2>&1 | head -5
```

**Fix — DNS issues di Docker:**
```bash
# Tambahkan DNS ke Docker daemon
sudo tee /etc/docker/daemon.json <<EOF
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
EOF

sudo systemctl restart docker
```

---

## Emergency Contact Escalation

| Level | Contact | Kapan |
|-------|---------|-------|
| L1 | Operator | Container down, login gagal |
| L2 | Developer | Code error, database issue |
| L3 | Infrastruktur | Server crash, disk full |
| Emergency | Admin TI Sekolah | Data corruption, security breach |

**Log yang harus dikumpulkan sebelum eskalasi:**
```bash
# Kumpulkan semua log penting
mkdir -p /tmp/alfakhir-debug
docker compose -f ~/alfakhir/docker-compose.prod.yml logs > /tmp/alfakhir-debug/all-containers.log
bash ~/alfakhir/scripts/health-check.sh > /tmp/alfakhir-debug/health.txt
docker system df > /tmp/alfakhir-debug/docker-df.txt
df -h > /tmp/alfakhir-debug/disk.txt
free -h > /tmp/alfakhir-debug/memory.txt
tar czf /tmp/alfakhir-debug-$(date +%Y%m%d).tar.gz /tmp/alfakhir-debug/
echo "Debug bundle: /tmp/alfakhir-debug-$(date +%Y%m%d).tar.gz"
```
