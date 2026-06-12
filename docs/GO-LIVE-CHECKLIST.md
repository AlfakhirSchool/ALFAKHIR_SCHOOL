# Al Fakhir School LMS — Go-Live Checklist

## Pre-Launch (H-7)

### Infrastructure
- [ ] Server Proxmox primary (lokasi 1) provisioned: min 8 core, 16GB RAM, 200GB SSD
- [ ] Server Proxmox secondary (lokasi 2) provisioned: min 4 core, 8GB RAM, 100GB SSD
- [ ] Domain `alfakhirschool.id` terdaftar dan DNS dikonfigurasi di Cloudflare
- [ ] SSL certificate Let's Encrypt aktif untuk semua subdomain:
  - [ ] `api.alfakhirschool.id`
  - [ ] `n8n.alfakhirschool.id`
  - [ ] `minio.alfakhirschool.id`
  - [ ] `monitoring.alfakhirschool.id`
- [ ] Cloudflare proxy aktif, SSL mode: Full (Strict)

### Database
- [ ] PostgreSQL 14 terinstall dan berjalan
- [ ] User database `alfakhir` dibuat dengan password kuat
- [ ] Database `alfakhir_school` dibuat
- [ ] Streaming replication ke standby server aktif: `SELECT * FROM pg_stat_replication;`
- [ ] `pgBackRest` dikonfigurasi, test backup manual berhasil
- [ ] Seed data awal diimport: `psql -U alfakhir alfakhir_school < scripts/seed-demo.sql`

### Application
- [ ] `.env.production` semua nilai sudah diisi (tidak ada placeholder)
- [ ] `docker-compose.prod.yml` `up -d` berhasil, semua container running
- [ ] Backend health check: `curl https://api.alfakhirschool.id/api/health` → `{"status":"ok"}`
- [ ] Migrasi database berhasil tanpa error
- [ ] MinIO bucket `alfakhir-files` dibuat

### Frontend
- [ ] `web-admin` deploy ke Vercel, environment variable `NEXT_PUBLIC_API_URL` dikonfigurasi
- [ ] `web-guru` deploy ke Vercel, environment variable dikonfigurasi
- [ ] Login admin berhasil di `https://admin.alfakhirschool.id`
- [ ] Login guru berhasil di `https://guru.alfakhirschool.id`

### Mobile
- [ ] `google-services.json` (Android) diletakkan di `siswa_app/android/app/`
- [ ] `google-services.json` (Android) diletakkan di `orang_tua_app/android/app/`
- [ ] `GoogleService-Info.plist` (iOS) diletakkan di masing-masing `ios/Runner/`
- [ ] APK siswa build release berhasil
- [ ] APK orang tua build release berhasil
- [ ] FCM push notification test berhasil

### Security
- [ ] Semua password bukan default/placeholder
- [ ] Rate limiting aktif di Nginx
- [ ] JWT secret min 64 karakter
- [ ] CORS hanya mengizinkan domain resmi
- [ ] `.env.production` tidak ada di git (cek `.gitignore`)
- [ ] PostgreSQL tidak accessible dari internet (hanya localhost/container network)

---

## Launch Day (H-0)

### Urutan Deploy
1. [ ] `bash scripts/deploy.sh primary` di server utama
2. [ ] Verifikasi semua container UP: `docker-compose -f docker-compose.prod.yml ps`
3. [ ] Tes login semua role: admin, guru, siswa, ortu
4. [ ] Import N8N workflows dari `n8n/*.json`
5. [ ] Aktifkan monitoring: `docker-compose -f monitoring/docker-compose.monitoring.yml up -d`
6. [ ] Cek Grafana dashboard (http://monitoring.alfakhirschool.id)
7. [ ] Setup cron backup:
   ```
   0 2 * * * /opt/alfakhir-school/scripts/backup.sh daily
   0 1 * * 0 /opt/alfakhir-school/scripts/backup.sh full
   ```
8. [ ] Distribute APK ke perangkat guru dan siswa test
9. [ ] Announcement ke semua pengguna

### Smoke Tests
- [ ] `POST /api/auth/login` → dapat token
- [ ] `GET /api/dashboard` → data KPI muncul
- [ ] `GET /api/siswa` → list siswa muncul
- [ ] Buat sesi QR absensi → kode 6 digit muncul
- [ ] Input nilai siswa → nilai_akhir terhitung otomatis
- [ ] Buat jurnal guru → submit → approved di web admin
- [ ] Pembayaran dibuat → N8N webhook trigger
- [ ] Push notification diterima di HP (FCM test)

---

## Post-Launch (H+1 s.d H+7)

### Monitoring Harian
- [ ] Cek Grafana: tidak ada alert merah
- [ ] Cek log backend: `docker logs alfakhir_backend --tail 100`
- [ ] Verifikasi backup harian berhasil: `ls -la backups/postgres/`
- [ ] Cek replikasi PostgreSQL: `SELECT * FROM pg_stat_replication;`
- [ ] Pantau error rate dari Prometheus
- [ ] Review audit log di web admin

### User Feedback
- [ ] Kumpulkan feedback guru (penggunaan absensi QR, jurnal)
- [ ] Kumpulkan feedback siswa (akses nilai, jadwal)
- [ ] Kumpulkan feedback orang tua (pantau anak, notifikasi pembayaran)
- [ ] Catat bug/request yang muncul

---

## Rollback Plan

Jika ada masalah kritis:

```bash
# Rollback ke versi sebelumnya
docker-compose -f docker-compose.prod.yml down
git checkout <previous-tag>
docker-compose -f docker-compose.prod.yml up -d

# Restore database (jika ada korupsi data)
docker exec -i alfakhir_postgres psql -U alfakhir alfakhir_school \
  < backups/postgres/full_<timestamp>.sql.gz

# Failover ke standby (jika primary down)
# Di standby server:
sudo -u postgres psql -c "SELECT pg_promote();"
# Update DNS Cloudflare ke IP standby
```

---

## Kontak Emergency

| Role | Nama | Kontak |
|------|------|--------|
| IT Admin | - | - |
| Database Admin | - | - |
| On-call Backend | - | - |
| Kepala Sekolah | - | - |
