# 🎓 Al Fakhir School LMS

**Multi-Jenjang Learning Management System** untuk SD, SMP, dan SMA Al Fakhir Islamic School.

> Self-hosted on Proxmox · Zero recurring cost · 1500+ users supported

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Proxmox VM-101                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Postgres │  │  Redis   │  │     MinIO        │  │
│  │   14     │  │    7     │  │  (object store)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌────────────────────┐  ┌────────────────────────┐ │
│  │  Backend (Express) │  │      N8N               │ │
│  │  Port 3001         │  │  (payment automation)  │ │
│  └────────────────────┘  └────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Nginx (reverse proxy)              │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↑                          ↑
  Web Dashboards              Flutter Apps
  (Next.js)                   (Android/iOS)
  web-admin :3000             siswa_app
  web-guru  :3002             orang_tua_app
```

---

## 🚀 Quick Start (Proxmox)

```bash
# 1. Run installer on Proxmox VM as root
curl -fsSL https://raw.githubusercontent.com/AlfakhirSchool/ALFAKHIR_SCHOOL/main/proxmox-install.sh | bash

# 2. Clone & start
git clone https://github.com/AlfakhirSchool/ALFAKHIR_SCHOOL.git ~/alfakhir
cd ~/alfakhir
cp .env.production .env
docker compose -f docker-compose.prod.yml up -d

# 3. Health check
bash scripts/health-check.sh
```

**Demo credentials:** `admin@alfakhirschool.sch.id` / `Admin@1234`

---

## 📦 Project Structure

```
alfakhir/
├── backend/            Express.js + TypeScript API (port 3001)
├── web-admin/          Next.js admin dashboard (port 3000)
├── web-guru/           Next.js guru dashboard (port 3002)
├── siswa_app/          Flutter student app
├── orang_tua_app/      Flutter parent app
├── monitoring/         Prometheus + Grafana stack
├── n8n/                Payment automation workflows
├── nginx/              Reverse proxy config
├── scripts/            Deployment & maintenance scripts
├── docs/               Complete documentation (10 files)
├── tests/              API test suite (55+ endpoints)
├── .github/workflows/  CI/CD pipelines
└── docker-compose.prod.yml
```

---

## 🔑 Key Features

| Feature | Detail |
|---------|--------|
| **Auth** | JWT + refresh token, RBAC (admin/guru/siswa/ortu) |
| **Absensi** | QR code session + manual input |
| **Nilai** | Kuis 10% + Tugas 15% + UTS 25% + UAS 50% |
| **Jurnal Guru** | Digital signature, workflow draft→submit→review→approve |
| **Rapor** | Generate PDF per kelas per semester |
| **Pembayaran** | BCA/Mandiri VA + N8N automation + FCM notif |
| **Monitoring** | Prometheus + Grafana + AlertManager |
| **Backup** | Daily pg_dump + optional Backblaze B2 offsite |

---

## 🌐 API Endpoints (67 total)

| Group | Count | Endpoint |
|-------|-------|---------|
| Auth | 5 | `/api/auth/*` |
| Siswa/Guru | 10 | `/api/siswa/*`, `/api/guru/*` |
| Kelas/Jadwal | 8 | `/api/kelas/*`, `/api/jadwal-pelajaran/*` |
| Absensi | 8 | `/api/absensi/*` |
| Nilai/Rapor | 8 | `/api/nilai/*`, `/api/rapor/*` |
| Pembayaran | 6 | `/api/pembayaran/*` |
| Jurnal | 12 | `/api/jurnal-guru/*` |
| Dashboard | 4 | `/api/dashboard/*` |
| Misc | 6 | `/api/health`, `/api/users/*`, etc. |

Full documentation: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

---

## 🏗️ Database (16 Tables)

`users` · `sekolah` · `kelas` · `mata_pelajaran` · `siswa` · `guru` · `orang_tua` · `jadwal_pelajaran` · `absensi` · `qr_code_session` · `nilai` · `rapor` · `pembayaran` · `pembayaran_detail` · `jurnal_guru` · `activity_log`

---

## 📱 Mobile Apps

**siswa_app** — 7 tabs: Beranda, Nilai, Absensi, Jadwal, Pembayaran, Rapor, Notifikasi

**orang_tua_app** — 7 tabs: Beranda, Absensi, Nilai, Bayar, Belajar, Rapor, Notifikasi + child selector

Build for production:
```bash
bash scripts/build-apk.sh
# or manual:
flutter build apk --dart-define=API_URL=https://api.alfakhirschool.id/api
```

---

## 📊 Monitoring

```bash
# Start monitoring stack
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# Access
# Grafana:    http://[VM_IP]:3100  (admin / alfakhir2025)
# Prometheus: http://[VM_IP]:9090
```

---

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy.sh` | Full production deployment |
| `scripts/backup.sh` | Database backup (pg_dump + gzip) |
| `scripts/restore.sh` | Restore from backup file |
| `scripts/health-check.sh` | System health verification |
| `scripts/setup-ssl.sh` | Let's Encrypt SSL setup |
| `scripts/update-deploy.sh` | Zero-downtime code update |
| `scripts/disaster-recovery.sh` | Failover procedures |
| `scripts/load-test.sh` | Performance load testing |
| `scripts/monitor.sh` | Runtime monitoring |
| `scripts/maintenance.sh` | Scheduled maintenance tasks |

---

## 📚 Documentation

| File | Content |
|------|---------|
| [`INSTALLATION_RUNBOOK.md`](docs/INSTALLATION_RUNBOOK.md) | Step-by-step install |
| [`DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) | Deployment procedures |
| [`API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Full API reference |
| [`TROUBLESHOOTING_GUIDE.md`](docs/TROUBLESHOOTING_GUIDE.md) | Common issues & fixes |
| [`OPERATIONS_MANUAL.md`](docs/OPERATIONS_MANUAL.md) | Daily operations |
| [`MONITORING_GUIDE.md`](docs/MONITORING_GUIDE.md) | Monitoring & alerts |
| [`DISASTER_RECOVERY_PLAN.md`](docs/DISASTER_RECOVERY_PLAN.md) | Recovery procedures |
| [`N8N_WORKFLOWS.md`](docs/N8N_WORKFLOWS.md) | Payment automation setup |
| [`VERCEL_SETUP_GUIDE.md`](docs/VERCEL_SETUP_GUIDE.md) | Web dashboard deployment |
| [`PLAYSTORE_GUIDE.md`](docs/PLAYSTORE_GUIDE.md) | Play Store submission |

---

## 🔒 Ports

| Service | Port |
|---------|------|
| Backend API | 3001 |
| web-admin | 3000 |
| web-guru | 3002 |
| Grafana | 3100 |
| Prometheus | 9090 |
| MinIO | 9000 / 9001 |
| N8N | 5678 |
| PostgreSQL | 5432 |
| Redis | 6379 |

---

## 📊 Project Stats

- **Lines of code:** 15,000+
- **API endpoints:** 67
- **Database tables:** 16
- **Web pages:** 24 (admin: 14, guru: 10)
- **Mobile screens:** 14 tabs + auth
- **Documentation:** 10 files
- **Scripts:** 14 production scripts
- **Test cases:** 55+ API tests

---

## 🌱 Environment Variables

Copy and configure:
```bash
cp .env.production .env
# Edit .env — set POSTGRES_PASSWORD, JWT_SECRET, SMTP_*, etc.
```

See `.env.production` for all required variables.

---

**Cost: $0 — Complete self-hosted solution on Proxmox** 🏠
