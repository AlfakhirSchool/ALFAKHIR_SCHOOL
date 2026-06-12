# Al Fakhir School LMS — Operations Manual

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**Install Directory:** `~/alfakhir`

---

## Table of Contents

1. [Daily Operations Checklist](#1-daily-operations-checklist)
2. [Weekly Maintenance](#2-weekly-maintenance)
3. [Monthly Tasks](#3-monthly-tasks)
4. [Starting and Stopping Services](#4-starting-and-stopping-services)
5. [Log Management](#5-log-management)
6. [User Management](#6-user-management)
7. [Common Admin Tasks](#7-common-admin-tasks)
8. [Alert Response Procedures](#8-alert-response-procedures)
9. [Backup and Restore Procedures](#9-backup-and-restore-procedures)
10. [Scaling Guide](#10-scaling-guide)

---

## 1. Daily Operations Checklist

Lakukan setiap hari kerja, idealnya pagi hari sebelum jam operasional sekolah.

### 1.1 Automated Health Check

Script health check sudah berjalan otomatis setiap 5 menit via cron. Untuk review manual:

```bash
# Lihat hasil health check terbaru
tail -20 ~/alfakhir/logs/health.log

# Atau jalankan secara manual
bash ~/alfakhir/scripts/health-check.sh
```

**Expected output semua hijau:**
```
=== Al Fakhir School LMS Health Check ===
--- Docker Containers ---
  ✓ Container alfakhir_postgres: healthy
  ✓ Container alfakhir_redis: healthy
  ✓ Container alfakhir_minio: healthy (no healthcheck)
  ✓ Container alfakhir_n8n: running (no healthcheck)
  ✓ Container alfakhir_backend: healthy
  ✓ Container alfakhir_nginx: running (no healthcheck)
--- API Endpoints ---
  ✓ GET /api/health → ok
  ✓ Response time: 0.08s (< 500ms)
--- Disk Space ---
  ✓ Disk usage: 45%
--- Backup Status ---
  ✓ Last backup: 7h ago (daily_20260613_190000.sql.gz)
--- SSL Certificates ---
  ✓ SSL api.alfakhirschool.id: 87 days left
```

### 1.2 Check Application Logs

```bash
# Cek error terbaru di backend
docker logs alfakhir_backend --since "24h" 2>&1 | grep -iE "error|warn|critical" | tail -20

# Cek nginx access log untuk error 5xx
docker logs alfakhir_nginx --since "24h" 2>&1 | grep ' 5[0-9][0-9] ' | tail -20

# Cek rate limiting hits (terlalu banyak = indikasi serangan)
docker logs alfakhir_nginx --since "24h" 2>&1 | grep "limiting requests" | wc -l
```

### 1.3 Verify Last Backup

```bash
# Backup otomatis setiap jam 02:00 WIB (19:00 UTC)
ls -lth ~/alfakhir/backups/postgres/ | head -5

# Verifikasi integritas backup terakhir
LAST_BACKUP=$(ls -t ~/alfakhir/backups/postgres/*.sql.gz 2>/dev/null | head -1)
if [ -n "$LAST_BACKUP" ]; then
  gunzip -t "$LAST_BACKUP" && echo "Backup OK: $(basename $LAST_BACKUP)" || echo "BACKUP CORRUPT!"
fi
```

### 1.4 Monitor Disk Usage

```bash
df -h / | awk 'NR==2 {print "Disk: " $5 " used (" $4 " free)"}'

# Alert jika di atas 80%
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK_PCT" -gt 80 ] && echo "WARNING: Disk usage at ${DISK_PCT}%!" || echo "Disk OK: ${DISK_PCT}%"
```

### Daily Checklist Summary

| Task | Command/Action | Expected |
|------|---------------|----------|
| Container status | `docker ps` | 6 containers running |
| API health | `curl localhost:3001/api/health` | `{"status":"ok"}` |
| Backup age | `ls -lt backups/postgres/ \| head -1` | < 25 jam |
| Disk usage | `df -h /` | < 80% |
| Error logs | `docker logs alfakhir_backend --since 24h \| grep error` | Tidak ada error kritis |
| SSL validity | `bash scripts/health-check.sh` | > 30 hari |

---

## 2. Weekly Maintenance

Lakukan setiap Senin pagi sebelum jam 08:00 WIB.

### 2.1 Update Docker Images

```bash
cd ~/alfakhir

# Pull image terbaru untuk base services
docker compose -f docker-compose.prod.yml pull postgres redis minio n8n nginx

# Restart services yang mendapat update (tanpa downtime signifikan)
docker compose -f docker-compose.prod.yml up -d --no-deps postgres
docker compose -f docker-compose.prod.yml up -d --no-deps redis
docker compose -f docker-compose.prod.yml up -d --no-deps nginx
```

> **Catatan:** Jangan update image sembarangan di production tanpa testing. Idealnya test di staging dulu.

### 2.2 Prune Docker Resources

```bash
# Hapus resources yang tidak dipakai
docker image prune -f --filter "until=72h"
docker container prune -f
docker network prune -f

# Cek berapa ruang yang dibebaskan
docker system df
```

### 2.3 Review Alert Logs

```bash
# Lihat semua alert yang terjadi minggu ini
cat ~/alfakhir/logs/health.log | grep -E "FAIL|WARN" | tail -50

# Lihat backup log
tail -30 ~/alfakhir/logs/backup.log

# Lihat SSL log
tail -20 ~/alfakhir/logs/ssl.log
```

### 2.4 Review PostgreSQL Performance

```bash
# Database size
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT pg_size_pretty(pg_database_size('alfakhir_school')) AS db_size;"

# Table sizes
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;"

# VACUUM ANALYZE untuk performa
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c "VACUUM ANALYZE;"
```

### 2.5 Check N8N Workflow Executions

1. Buka https://n8n.alfakhirschool.id
2. Login sebagai admin
3. Navigasi ke **Executions** (menu kiri)
4. Pastikan tidak ada execution yang failed berulang
5. Jika ada, lihat detail error dan fix sesuai `N8N_WORKFLOWS.md`

---

## 3. Monthly Tasks

Lakukan di awal bulan (tanggal 1-3).

### 3.1 Rotate Secrets (Opsional, jika ada indikasi compromise)

```bash
# Generate secrets baru
NEW_JWT=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9@#%' | head -c 48)
NEW_REFRESH=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9@#%' | head -c 48)

# Update .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT}/" ~/alfakhir/.env
sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${NEW_REFRESH}/" ~/alfakhir/.env

# Restart backend (semua user harus login ulang!)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend

echo "PENTING: Semua pengguna harus login ulang setelah perubahan JWT secret"
```

### 3.2 Review Performance Metrics

Jika menggunakan monitoring stack (Grafana):
```bash
# Akses Grafana
# URL: http://<SERVER_IP>:3100 (atau via nginx jika dikonfigurasi)
# Login: admin / alfakhir2025
```

Metrics yang perlu direview:
- Average API response time (target < 500ms)
- Error rate (target < 1%)
- Database connections (target < 50)
- Memory usage (target < 80%)

### 3.3 Capacity Planning

```bash
# Pertumbuhan ukuran database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT schemaname, tablename, 
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
     n_live_tup AS row_count
   FROM pg_stat_user_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 15;"

# Penggunaan disk per volume Docker
docker system df -v | grep -A 30 "Local Volumes"

# Estimasi waktu sebelum disk penuh
DISK_USED_MB=$(df -m / | awk 'NR==2 {print $3}')
DISK_AVAIL_MB=$(df -m / | awk 'NR==2 {print $4}')
echo "Disk used: ${DISK_USED_MB} MB | Available: ${DISK_AVAIL_MB} MB"
```

### 3.4 Review dan Cleanup Old Backups

```bash
# Backup sudah di-cleanup otomatis (retention 30 hari), tapi cek manual:
ls -lth ~/alfakhir/backups/postgres/ | tail -20

# Hapus backup lebih dari 60 hari
find ~/alfakhir/backups/postgres/ -name "*.sql.gz" -mtime +60 -delete
echo "Cleanup done"
```

### 3.5 Review Audit Logs

```bash
# Lihat aktivitas admin 30 hari terakhir via API
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/audit-log/stats" | jq .
```

---

## 4. Starting and Stopping Services

### Start All Services

```bash
cd ~/alfakhir
docker compose -f docker-compose.prod.yml up -d

# Verifikasi semua running
docker compose -f docker-compose.prod.yml ps
```

### Stop All Services (Graceful)

```bash
cd ~/alfakhir
docker compose -f docker-compose.prod.yml down

# Atau dengan timeout lebih lama untuk data safety
docker compose -f docker-compose.prod.yml down --timeout 60
```

### Restart Specific Service

```bash
# Restart backend saja (paling sering diperlukan)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend

# Restart database (hati-hati: akan memutus semua koneksi)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart postgres

# Restart nginx (untuk reload SSL cert atau config)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart nginx
# Atau reload nginx tanpa restart container:
docker exec alfakhir_nginx nginx -s reload
```

### Start/Stop Individual Services

```bash
# Stop backend saja (maintenance mode)
docker compose -f ~/alfakhir/docker-compose.prod.yml stop backend

# Start kembali
docker compose -f ~/alfakhir/docker-compose.prod.yml start backend
```

### Service Start Order (untuk fresh start)

```bash
# Urutan yang benar: database → cache → storage → backend → gateway
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d postgres redis
sleep 20  # tunggu database healthy
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d minio n8n
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d backend
sleep 30  # tunggu backend healthy
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d nginx
```

---

## 5. Log Management

### Log Locations

| Service | Log Location |
|---------|-------------|
| Backend (app logs) | `~/alfakhir/logs/combined.log` |
| Backend (error logs) | `~/alfakhir/logs/error.log` |
| Backend (container logs) | `docker logs alfakhir_backend` |
| PostgreSQL | `docker logs alfakhir_postgres` |
| Redis | `docker logs alfakhir_redis` |
| Nginx (access) | `docker logs alfakhir_nginx` atau volume `nginx_logs` |
| N8N | `docker logs alfakhir_n8n` |
| Backup script | `~/alfakhir/logs/backup.log` |
| Health check | `~/alfakhir/logs/health.log` |
| SSL renewal | `~/alfakhir/logs/ssl.log` |
| System (alfakhir cron) | `sudo journalctl -u cron | grep alfakhir` |

### Viewing Logs

```bash
# Backend logs real-time
docker logs alfakhir_backend -f --tail 100

# Backend logs dengan timestamp
docker logs alfakhir_backend --timestamps --since "2h"

# Filter error saja
docker logs alfakhir_backend --since "1h" 2>&1 | grep -iE "error|fatal|critical"

# Nginx access log
docker logs alfakhir_nginx --since "1h" 2>&1 | grep -v "GET /api/health"

# PostgreSQL log
docker logs alfakhir_postgres --since "1h" 2>&1 | grep -iE "error|fatal|warning"
```

### Log Rotation

Docker container logs sudah dikonfigurasi dengan rotation di `docker-compose.prod.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "5"
```

Untuk log file di `~/alfakhir/logs/`, setup logrotate:

```bash
sudo tee /etc/logrotate.d/alfakhir-school <<LOGROTATE
/root/alfakhir/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
LOGROTATE
```

### Important Log Patterns

| Pattern | Severity | Action |
|---------|----------|--------|
| `Error: ECONNREFUSED` | High | Cek service yang down |
| `JWT malformed` | Medium | Normal jika sedikit, investigate jika banyak |
| `limiting requests` | Medium | Monitor untuk DDoS |
| `pg_isready: No such file` | Critical | Postgres container down |
| `Sequelize DatabaseError` | High | Database issue, cek query |
| `FATAL: password authentication` | High | Credential mismatch |
| `disk quota exceeded` | Critical | Disk penuh, cleanup segera |

---

## 6. User Management

### 6.1 Add New Admin User

```bash
# Via API (perlu login sebagai admin terlebih dahulu)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')

curl -s -X POST http://localhost:3001/api/auth/register-admin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "Nama Admin Baru",
    "email": "admin2@alfakhirschool.id",
    "password": "SecurePass@2025",
    "role": "admin"
  }' | jq .
```

### 6.2 Reset User Password

```bash
# Via database langsung (jika tidak bisa via API)
# Step 1: Generate bcrypt hash
NEW_HASH=$(docker exec alfakhir_backend node -e "
  const bcrypt = require('bcryptjs');
  bcrypt.hash('NewPassword@123', 12, (err, hash) => process.stdout.write(hash));
")

# Step 2: Update di database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "UPDATE users SET password = '${NEW_HASH}' WHERE email = 'user@alfakhirschool.id';"

echo "Password berhasil direset"
```

### 6.3 Deactivate User

```bash
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "UPDATE users SET is_active = false WHERE email = 'user@alfakhirschool.id';
   SELECT id, email, role, is_active FROM users WHERE email = 'user@alfakhirschool.id';"
```

### 6.4 Activate User

```bash
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "UPDATE users SET is_active = true WHERE email = 'user@alfakhirschool.id';"
```

### 6.5 List Users by Role

```bash
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT u.id, u.email, u.role, u.is_active, 
     CASE u.role 
       WHEN 'guru' THEN g.nama
       WHEN 'siswa' THEN s.nama
       ELSE u.email 
     END AS nama
   FROM users u
   LEFT JOIN guru g ON g.user_id = u.id
   LEFT JOIN siswa s ON s.user_id = u.id
   WHERE u.role = 'admin'
   ORDER BY u.created_at DESC;"
```

---

## 7. Common Admin Tasks

### 7.1 Add New Sekolah

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')

# Cek endpoint sekolah
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/sekolah | jq .

# Tambah sekolah baru (jika endpoint tersedia)
curl -s -X POST http://localhost:3001/api/sekolah \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "Al Fakhir School Cabang Baru",
    "kode": "AFS-CB",
    "alamat": "Jl. ...",
    "kota": "Jakarta"
  }' | jq .
```

### 7.2 Add New Kelas

```bash
curl -s -X POST http://localhost:3001/api/kelas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "X IPA 1",
    "jenjang": "SMA",
    "tingkat": 10,
    "tahun_ajaran": "2025/2026",
    "sekolah_id": "<UUID_SEKOLAH>"
  }' | jq .
```

### 7.3 Run Generate Rapor

```bash
# Untuk satu kelas
curl -s -X POST http://localhost:3001/api/rapor/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kelas_id": "<UUID_KELAS>",
    "semester": 1,
    "tahun_ajaran": "2025/2026"
  }' | jq .
```

**Waktu proses:** Generate rapor untuk 1 kelas (30 siswa) memakan waktu sekitar 5-15 detik.

### 7.4 Bulk Create Pembayaran (SPP Bulanan)

```bash
# Buat tagihan SPP untuk semua siswa kelas tertentu
# Ini dilakukan via admin dashboard web atau API batch

# Lihat endpoint pembayaran
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/pembayaran?page=1&limit=10" | jq .
```

### 7.5 Export Data Pembayaran

```bash
# Export via API (format CSV/Excel jika didukung)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/pembayaran?export=true&tahun=2025&bulan=6" \
  -o /tmp/pembayaran-juni-2025.csv
```

### 7.6 Database Maintenance Manual

```bash
# REINDEX jika query lambat
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "REINDEX DATABASE alfakhir_school;"

# VACUUM FULL (hati-hati: akan lock table, lakukan saat jam rendah)
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "VACUUM FULL ANALYZE;"
```

---

## 8. Alert Response Procedures

### Alert: BackendDown (Critical)

**Symptom:** API tidak merespons  
**Response Time:** Segera (< 5 menit)

```bash
# 1. Cek status container
docker ps | grep backend

# 2. Lihat log
docker logs alfakhir_backend --tail 50

# 3. Restart backend
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend

# 4. Verifikasi
sleep 30 && curl -sf http://localhost:3001/api/health
```

### Alert: PostgresDown (Critical)

**Response Time:** Segera (< 5 menit)

```bash
# 1. Cek status
docker ps | grep postgres
docker logs alfakhir_postgres --tail 30

# 2. Restart
docker compose -f ~/alfakhir/docker-compose.prod.yml restart postgres

# 3. Tunggu healthy (max 60 detik)
timeout 60 bash -c 'until docker exec alfakhir_postgres pg_isready -U alfakhir; do sleep 3; done'

# 4. Restart backend (untuk re-establish connections)
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Alert: HighCpuUsage (Warning)

**Response Time:** < 30 menit

```bash
# 1. Identifikasi proses penyebab
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 2. Cek slow queries
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT pid, query, now() - query_start AS duration
   FROM pg_stat_activity WHERE state != 'idle'
   ORDER BY duration DESC LIMIT 5;"

# 3. Restart container penyebab jika perlu
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Alert: DiskSpaceLow (Warning)

**Response Time:** < 2 jam

```bash
# 1. Identifikasi penyebab
du -sh ~/alfakhir/*/ | sort -rh | head -10
docker system df

# 2. Cleanup Docker
docker image prune -af --filter "until=72h"
docker container prune -f

# 3. Hapus backup lama
find ~/alfakhir/backups/postgres/ -name "*.sql.gz" -mtime +30 -delete

# 4. Kompres log lama
gzip ~/alfakhir/logs/*.log.1 2>/dev/null || true

# 5. Jika masih penuh, pertimbangkan expand disk VM di Proxmox
```

### Alert: HighMemoryUsage (Critical > 90%)

**Response Time:** < 15 menit

```bash
# 1. Identifikasi container yang makan memory
docker stats --no-stream

# 2. Restart container memory hog
# Biasanya backend atau postgres
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend

# 3. Jika swap habis
sudo swapon --show
# Tambah swap jika belum ada
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 9. Backup and Restore Procedures

### 9.1 Manual Backup

```bash
# Daily backup (otomatis via cron, tapi bisa manual)
bash ~/alfakhir/scripts/backup.sh daily

# Full backup (untuk sebelum update major)
bash ~/alfakhir/scripts/backup.sh full

# Verifikasi backup
LAST=$(ls -t ~/alfakhir/backups/postgres/*.sql.gz | head -1)
echo "Latest backup: $LAST ($(du -sh $LAST | cut -f1))"
gunzip -t "$LAST" && echo "Integrity: OK"
```

### 9.2 Restore dari Backup

```bash
# PERINGATAN: Akan overwrite database yang ada!

# List backup yang tersedia
bash ~/alfakhir/scripts/restore.sh list

# Restore PostgreSQL dari backup spesifik
bash ~/alfakhir/scripts/restore.sh postgres \
  ~/alfakhir/backups/postgres/daily_20260613_190000.sql.gz

# Restore semua (postgres + minio)
bash ~/alfakhir/scripts/restore.sh all
```

Restore script akan:
1. Stop backend dan n8n
2. Drop dan recreate database
3. Import SQL dump
4. Start semua services
5. Verifikasi API health

### 9.3 Backup ke Backblaze B2 (Off-site)

Jika `B2_ACCOUNT_ID` dan `B2_APPLICATION_KEY` sudah dikonfigurasi di `.env`:

```bash
# Backup otomatis akan upload ke B2
# Untuk upload manual:
source ~/alfakhir/.env
b2 authorize-account "$B2_ACCOUNT_ID" "$B2_APPLICATION_KEY"
b2 upload-file "$B2_BUCKET_NAME" \
  ~/alfakhir/backups/postgres/full_$(date +%Y%m%d).sql.gz \
  "postgres/full_$(date +%Y%m%d).sql.gz"
```

### 9.4 Restore dari Backblaze B2

```bash
bash ~/alfakhir/scripts/restore.sh postgres
# Script akan menanyakan apakah ingin download dari B2
```

---

## 10. Scaling Guide

### 10.1 Vertical Scaling (Tambah Resources VM)

**Kapan diperlukan:** CPU > 80% sustained atau RAM > 85% sustained

**Steps di Proxmox:**

1. **Stop VM:**
   ```bash
   # Di server
   sudo systemctl stop alfakhir-school
   sudo poweroff
   ```

2. **Di Proxmox GUI:**
   - Pilih VM 200 → Hardware
   - Edit Memory: naikkan dari 8GB ke 16GB
   - Edit Processors: naikkan dari 4 ke 8 cores
   - Resize disk (jika diperlukan): Hardware → Hard Disk → Resize

3. **Start VM dan verifikasi:**
   ```bash
   sudo systemctl start alfakhir-school
   free -h && nproc
   docker compose -f ~/alfakhir/docker-compose.prod.yml ps
   ```

4. **Update PostgreSQL shared_buffers (25% dari RAM):**
   ```bash
   docker exec alfakhir_postgres psql -U alfakhir -c \
     "ALTER SYSTEM SET shared_buffers = '4GB';"
   docker compose -f ~/alfakhir/docker-compose.prod.yml restart postgres
   ```

### 10.2 Horizontal Scaling — Add Services

**Tambah Redis cluster (jika Redis menjadi bottleneck):**

Saat ini Redis dikonfigurasi standalone dengan `maxmemory 512mb`. Untuk naik ke Redis Sentinel atau Cluster, perlu perubahan konfigurasi backend.

**Tambah PostgreSQL read replica:**

```bash
# Jalankan setup replication (sudah ada script-nya)
bash ~/alfakhir/scripts/setup-replication.sh
```

### 10.3 Monitoring Growth

```bash
# Cek pertumbuhan database
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c "
  SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name::regclass)) AS size,
    (SELECT count(*) FROM information_schema.tables WHERE table_name = t.table_name) AS est_rows
  FROM (
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public'
  ) t
  ORDER BY pg_total_relation_size(table_name::regclass) DESC
  LIMIT 10;
"
```

**Target capacity planning:**
- Database < 10 GB: aman dengan VM spec saat ini
- Database 10-50 GB: pertimbangkan vertical scaling (disk + RAM)
- Database > 50 GB: pertimbangkan PostgreSQL partitioning dan read replica
- Pengguna aktif > 500 concurrent: pertimbangkan load balancer + multiple backend instance
