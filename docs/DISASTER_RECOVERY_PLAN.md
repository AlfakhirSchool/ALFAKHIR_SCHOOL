# Al Fakhir School LMS — Disaster Recovery Plan

**Version:** 1.0 | **Last Updated:** 2025-06-13  
**Owner:** Tim IT Al Fakhir School  
**Contact:** smpislamalfakhir@gmail.com

---

## 1. Recovery Objectives

| Objective | Target | Notes |
|-----------|--------|-------|
| **RTO** (Recovery Time Objective) | ≤ 2 jam | Waktu maksimal sistem kembali online |
| **RPO** (Recovery Point Objective) | ≤ 24 jam | Maksimal data yang boleh hilang |
| Backup frequency | Setiap hari pukul 02:00 WIB | Otomatis via cron |
| Backup retention | 30 hari lokal + offsite B2 | Restic ke Backblaze B2 |

---

## 2. Disaster Scenarios & Response Matrix

| Skenario | Severity | RTO Target | Prosedur |
|----------|----------|------------|----------|
| Satu container crash | Low | 5 menit | Restart container |
| Backend tidak bisa start | Medium | 30 menit | Rebuild image + restore |
| Database corrupt | High | 1 jam | Restore dari backup |
| Penghapusan data tidak sengaja | High | 1 jam | Point-in-time restore |
| Server total loss | Critical | 2 jam | Rebuild di VM baru |
| DDoS attack | Medium | 15 menit | Rate limit + block IP |
| SSL expired | Medium | 30 menit | Renew certbot |

---

## 3. Contact & Escalation

```
Level 1 (On-call)   → Admin IT Al Fakhir: smpislamalfakhir@gmail.com
Level 2 (Escalate)  → Kepala Sekolah
Level 3 (External)  → Vendor/Developer pendukung

Response time:
- Critical: 15 menit
- High: 1 jam
- Medium: 4 jam
- Low: Next business day
```

---

## 4. Skenario 1: Container Crash (Low)

**Gejala:** Satu service tidak merespon, tapi server masih up.

**Diagnosis:**
```bash
docker ps -a | grep -v "Up"
docker logs [container_name] --tail 50
```

**Pemulihan (< 5 menit):**
```bash
cd ~/alfakhir

# Restart satu container
docker restart alfakhir_backend

# Atau start ulang semua
docker compose -f docker-compose.prod.yml up -d

# Verifikasi
curl http://localhost:3001/api/health
bash scripts/health-check.sh
```

---

## 5. Skenario 2: Backend Tidak Bisa Start (Medium)

**Gejala:** `alfakhir_backend` exit dengan error, container restart loop.

**Diagnosis:**
```bash
docker logs alfakhir_backend --tail 100
docker inspect alfakhir_backend | grep -A5 "State"
```

**Pemulihan (< 30 menit):**

```bash
cd ~/alfakhir

# 1. Lihat error detail
docker logs alfakhir_backend 2>&1 | tail -50

# 2. Rebuild image dari source terbaru
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache backend

# 3. Start ulang
docker compose -f docker-compose.prod.yml up -d backend

# 4. Cek health
sleep 30
curl http://localhost:3001/api/health

# 5. Kalau masih gagal, rollback ke image sebelumnya
docker tag alfakhir_backend:rollback alfakhir_backend:latest
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## 6. Skenario 3: Database Corruption (High)

**Gejala:** PostgreSQL error, data tidak konsisten, backend tidak bisa connect ke DB.

**Diagnosis:**
```bash
docker exec alfakhir_postgres pg_isready -U alfakhir
docker logs alfakhir_postgres --tail 100
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c "SELECT 1;"
```

**Pemulihan (< 1 jam):**

```bash
# STEP 1: Stop backend & n8n (jangan stop postgres dulu)
docker stop alfakhir_backend alfakhir_n8n

# STEP 2: Cek backup terbaru tersedia
ls -la ~/alfakhir/backups/postgres/ | tail -5

# STEP 3: Restore dari backup
bash scripts/restore.sh postgres
# → Script akan tanya file backup mana yang mau dipakai

# STEP 4: Start ulang semua
docker compose -f docker-compose.prod.yml up -d

# STEP 5: Verifikasi integritas data
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT table_name, COUNT(*) FROM information_schema.tables t
   JOIN (SELECT 'users' AS tn UNION SELECT 'siswa' UNION SELECT 'kelas') r
     ON t.table_name = r.tn
   GROUP BY table_name;"

# STEP 6: Health check
bash scripts/health-check.sh
```

---

## 7. Skenario 4: Penghapusan Data Tidak Sengaja (High)

**Gejala:** Data terhapus dari dashboard, perlu dikembalikan.

**Pemulihan (< 1 jam):**

```bash
# STEP 1: Identifikasi kapan data terhapus (dari audit log)
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT * FROM activity_logs WHERE action = 'DELETE' ORDER BY created_at DESC LIMIT 20;"

# STEP 2: Temukan backup sebelum penghapusan
ls -la ~/alfakhir/backups/postgres/

# STEP 3: Restore ke database sementara
docker exec alfakhir_postgres createdb -U alfakhir alfakhir_recovery

BACKUP_FILE="~/alfakhir/backups/postgres/daily_YYYYMMDD_HHMMSS.sql.gz"
gunzip -c "$BACKUP_FILE" | docker exec -i alfakhir_postgres \
  psql -U alfakhir alfakhir_recovery

# STEP 4: Extract data yang hilang
docker exec alfakhir_postgres psql -U alfakhir alfakhir_recovery -c \
  "SELECT * FROM [table_name] WHERE id = '[deleted_id]';" > /tmp/recovered_data.txt

cat /tmp/recovered_data.txt

# STEP 5: Re-insert data yang dipulihkan ke database utama
docker exec alfakhir_postgres psql -U alfakhir alfakhir_school -c \
  "INSERT INTO [table_name] (...) VALUES (...);"

# STEP 6: Cleanup recovery db
docker exec alfakhir_postgres dropdb -U alfakhir alfakhir_recovery
```

---

## 8. Skenario 5: Server Total Loss / Bencana (Critical)

**Gejala:** VM tidak bisa booting, hardware failure, atau perlu migrasi ke server baru.

**Pemulihan (< 2 jam):**

### Fase 1: Persiapan Server Baru (30 menit)

```bash
# Di Proxmox: Buat VM baru Ubuntu 24.04
# Spec minimal: 2 CPU, 4GB RAM, 40GB disk

# SSH ke server baru
ssh root@[NEW_SERVER_IP]

# Install sistem
curl -fsSL https://raw.githubusercontent.com/AlfakhirSchool/ALFAKHIR_SCHOOL/main/proxmox-install.sh \
  -o /tmp/install.sh
bash /tmp/install.sh

# Script otomatis: install Docker, clone repo, generate .env
```

### Fase 2: Restore Data (30 menit)

```bash
# Salin backup dari lokasi lain / Backblaze B2
# Option A: Dari backup lokal di lokasi lain
scp backup_server:/backups/postgres/daily_LATEST.sql.gz ~/alfakhir/backups/postgres/

# Option B: Download dari Backblaze B2
b2 authorize-account $B2_ACCOUNT_ID $B2_APPLICATION_KEY
b2 download-file-by-name alfakhir-backups postgres/daily_LATEST.sql.gz \
  ~/alfakhir/backups/postgres/daily_LATEST.sql.gz

# Restore database
bash ~/alfakhir/scripts/restore.sh postgres ~/alfakhir/backups/postgres/daily_LATEST.sql.gz
```

### Fase 3: Verifikasi & DNS Update (15 menit)

```bash
# Verifikasi semua services running
bash ~/alfakhir/scripts/health-check.sh

# Update DNS di provider domain:
# api.alfakhirschool.id → A → [NEW_SERVER_IP]
# n8n.alfakhirschool.id → A → [NEW_SERVER_IP]
# minio.alfakhirschool.id → A → [NEW_SERVER_IP]

# Tunggu DNS propagate (5-30 menit), lalu setup SSL
bash ~/alfakhir/scripts/setup-ssl.sh install
```

### Fase 4: Komunikasi (15 menit)

```
Template notifikasi untuk user:

Subject: [Al Fakhir LMS] Sistem Kembali Normal

Kepada Yth. Pengguna Al Fakhir School LMS,

Sistem LMS telah kembali beroperasi normal setelah pemulihan dari gangguan teknis.

Data terakhir yang tersedia: [tanggal backup terakhir]
Estimasi data yang hilang: [periode]

Mohon maaf atas ketidaknyamanan ini.

Salam,
Tim IT Al Fakhir School
```

---

## 9. Skenario 6: DDoS Attack (Medium)

**Gejala:** Server sangat lambat, request timeout, log penuh dengan request dari banyak IP.

**Respon Cepat (< 15 menit):**

```bash
# STEP 1: Aktifkan maintenance mode
bash scripts/maintenance.sh on

# STEP 2: Lihat IP yang paling banyak request
docker exec alfakhir_nginx tail -1000 /var/log/nginx/access.log \
  | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# STEP 3: Block IP pelaku
ufw deny from [ATTACKER_IP] to any
ufw deny from [ATTACKER_IP_RANGE]/24 to any

# STEP 4: Aktifkan rate limiting lebih ketat di nginx
# Edit nginx/nginx.conf → kurangi limit_req_zone
# Rebuild nginx config
docker exec alfakhir_nginx nginx -s reload

# STEP 5: Matikan maintenance mode
bash scripts/maintenance.sh off

# STEP 6: Monitor apakah serangan berlanjut
bash scripts/monitor.sh watch
```

---

## 10. Skenario 7: SSL Certificate Expired (Medium)

**Gejala:** Browser menampilkan "Your connection is not private", HTTPS tidak bisa diakses.

```bash
# Cek status semua sertifikat
bash scripts/setup-ssl.sh status

# Renew paksa
bash scripts/setup-ssl.sh renew

# Jika gagal (domain/DNS issue)
bash scripts/setup-ssl.sh test  # dry run untuk diagnosa
```

---

## 11. Backup Verification (DR Test)

Jalankan verifikasi backup setiap minggu:

```bash
# Verifikasi integritas backup terbaru
bash scripts/backup.sh verify

# Expected output:
# ✓ File backup ada: daily_YYYYMMDD_HHMMSS.sql.gz
# ✓ File size OK: X MB (> 100KB)
# ✓ gzip integrity: OK
# ✓ SQL header valid: PostgreSQL dump
# ✓ MinIO backup: X files
```

---

## 12. DR Test Schedule

| Frekuensi | Test | Penanggung Jawab |
|-----------|------|-----------------|
| **Mingguan** | Verifikasi backup (`backup.sh verify`) | Admin IT |
| **Bulanan** | Restore ke DB test di server dev | Admin IT |
| **Kuartalan** | Full DR drill: rebuild VM + restore data | Admin IT + Kepala Sekolah |
| **Tahunan** | Review & update DRP ini | Admin IT |

### Template DR Drill Monthly

```bash
# 1. Buat DB sementara di server dev
docker exec alfakhir_postgres createdb -U alfakhir dr_test_$(date +%Y%m)

# 2. Restore backup ke DB test
LATEST=$(ls -t ~/alfakhir/backups/postgres/*.sql.gz | head -1)
gunzip -c "$LATEST" | docker exec -i alfakhir_postgres \
  psql -U alfakhir dr_test_$(date +%Y%m)

# 3. Verifikasi row counts
docker exec alfakhir_postgres psql -U alfakhir -d dr_test_$(date +%Y%m) -c \
  "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# 4. Bandingkan dengan production
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# 5. Record hasil
echo "DR Test $(date): PASS/FAIL - Users: X, Siswa: Y, dll" >> ~/alfakhir/logs/dr-test.log

# 6. Cleanup
docker exec alfakhir_postgres dropdb -U alfakhir dr_test_$(date +%Y%m)
```

---

## 13. Disaster Recovery Checklist

### Saat Insiden

- [ ] Identifikasi skenario (container/DB/server/DDoS)
- [ ] Catat waktu insiden mulai
- [ ] Aktifkan maintenance mode (`bash scripts/maintenance.sh on`)
- [ ] Notifikasi stakeholder (Kepala Sekolah + pengguna jika > 30 menit)
- [ ] Mulai prosedur recovery sesuai skenario
- [ ] Dokumentasikan setiap langkah yang diambil

### Setelah Recovery

- [ ] Verifikasi API health: `curl http://localhost:3001/api/health`
- [ ] Verifikasi data integrity: cek row counts di tabel utama
- [ ] Jalankan health check: `bash scripts/health-check.sh`
- [ ] Matikan maintenance mode: `bash scripts/maintenance.sh off`
- [ ] Catat waktu recovery selesai (hitung actual RTO)
- [ ] Tulis post-mortem (apa yang terjadi, kenapa, solusi, pencegahan)
- [ ] Update DRP jika ada prosedur baru yang dipelajari

---

## 14. Backup Locations

| Lokasi | Path | Retention | Teknologi |
|--------|------|-----------|-----------|
| Lokal (Server) | `~/alfakhir/backups/postgres/` | 30 hari | pg_dump + gzip |
| Remote (Cloud) | Backblaze B2: `alfakhir-backups` | 3 bulan | Restic |
| Manual Export | `~/alfakhir/backups/exports/` | Sesuai kebutuhan | pg_dump |

### Restore priority

1. **Paling cepat:** Backup lokal terbaru di server yang sama
2. **Jika server loss:** Download dari Backblaze B2
3. **Terakhir:** Manual export jika tersedia

---

*Dokumen ini harus direview setiap 6 bulan atau setelah setiap insiden besar.*  
*Support: smpislamalfakhir@gmail.com*
