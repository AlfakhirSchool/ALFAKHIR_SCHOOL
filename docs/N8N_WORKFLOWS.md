# Al Fakhir School LMS — N8N Workflows Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**N8N URL:** https://n8n.alfakhirschool.id

---

## Table of Contents

1. [Accessing N8N](#1-accessing-n8n)
2. [Importing Workflow JSON Files](#2-importing-workflow-json-files)
3. [Configuring Credentials](#3-configuring-credentials)
4. [Workflow: Payment Creation](#4-workflow-payment-creation)
5. [Workflow: Payment Confirmation](#5-workflow-payment-confirmation)
6. [Workflow: Overdue Reminder](#6-workflow-overdue-reminder)
7. [Testing Workflows](#7-testing-workflows)
8. [Webhook URLs Configuration](#8-webhook-urls-configuration)
9. [Monitoring Workflow Executions](#9-monitoring-workflow-executions)
10. [Troubleshooting N8N](#10-troubleshooting-n8n)

---

## 1. Accessing N8N

### URL dan Credentials

| Item | Value |
|------|-------|
| URL | https://n8n.alfakhirschool.id |
| Username | `admin` (dari `.env`: `N8N_USER`) |
| Password | Dari `.env`: `N8N_PASSWORD` |

```bash
# Lihat credentials di server
grep -E "N8N_USER|N8N_PASSWORD" ~/alfakhir/.env
```

### Jika Lupa Password N8N

```bash
# Reset via Docker environment variable
# Edit .env dan set password baru
nano ~/alfakhir/.env
# Ubah: N8N_PASSWORD=PasswordBaru@2025

# Restart N8N
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d --no-deps n8n
```

### N8N Interface Overview

Setelah login, Anda akan melihat:
- **Workflows** (kiri): daftar semua workflow
- **Executions** (kiri): riwayat eksekusi
- **Credentials** (kiri): manajemen API keys
- **Settings** (bawah kiri): konfigurasi N8N

---

## 2. Importing Workflow JSON Files

File workflow tersimpan di direktori `n8n/` di repositori:

```
~/alfakhir/n8n/
├── payment-creation.json      # Notifikasi tagihan baru
├── payment-confirmation.json  # Notifikasi pembayaran dikonfirmasi
└── overdue-reminder.json      # Reminder tagihan terlambat
```

### Cara Import via N8N Web UI

1. Buka https://n8n.alfakhirschool.id
2. Login
3. Klik **+ New Workflow** di pojok kanan atas
4. Di editor workflow, klik **...** (three dots) → **Import from File**
5. Upload file JSON (contoh: `payment-creation.json`)
6. Klik **Save** dengan nama yang sesuai
7. **Aktifkan workflow:** Toggle switch di kanan atas → ON (hijau)

### Import via N8N API (Otomatis)

```bash
N8N_PASS=$(grep N8N_PASSWORD ~/alfakhir/.env | cut -d= -f2)
N8N_USER=$(grep N8N_USER ~/alfakhir/.env | cut -d= -f2)

# Dapatkan API key N8N
N8N_API_KEY=$(curl -s -X POST https://n8n.alfakhirschool.id/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${N8N_USER}\",\"password\":\"${N8N_PASS}\"}" \
  | jq -r '.data.token')

# Import setiap workflow
for wf in payment-creation payment-confirmation overdue-reminder; do
  echo "Importing $wf..."
  curl -s -X POST https://n8n.alfakhirschool.id/api/v1/workflows \
    -H "Authorization: Bearer $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$HOME/alfakhir/n8n/${wf}.json"
  echo "Done: $wf"
done
```

### Urutan Import yang Benar

Import dalam urutan ini:
1. `payment-creation.json` (tidak ada dependensi)
2. `payment-confirmation.json` (tidak ada dependensi)
3. `overdue-reminder.json` (membutuhkan backend URL dikonfigurasi)

---

## 3. Configuring Credentials

### 3.1 Credential: HTTP Header Auth (untuk Backend API)

Digunakan oleh workflow Overdue Reminder untuk autentikasi ke backend.

1. Di N8N: **Settings** → **Credentials** → **+ Add Credential**
2. Cari: **Header Auth**
3. Isi:
   - Name: `Al Fakhir Backend Auth`
   - Name: `Authorization`
   - Value: `Bearer <INTERNAL_SERVICE_TOKEN>`

> **Catatan:** Buat internal service token di backend atau gunakan token admin yang tidak kadaluarsa. Untuk implementasi sederhana, bisa gunakan token admin jangka panjang yang dibuat secara manual.

```bash
# Generate long-lived token (jika backend mendukung)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')
echo "Token: $TOKEN"
```

### 3.2 Credential: FCM via Environment Variable

N8N mengakses `FCM_SERVER_KEY` langsung dari environment variable `$env.FCM_SERVER_KEY`.

Pastikan variabel ini di-set di Docker:

```bash
grep FCM_SERVER_KEY ~/alfakhir/.env
```

Jika kosong, isi dengan server key dari Firebase Console:
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Cloud Messaging
3. Copy **Server key** (Legacy)
4. Update `.env`:
   ```
   FCM_SERVER_KEY=AAAAxxxxxxx:APA91...
   ```
5. Restart N8N:
   ```bash
   docker compose -f ~/alfakhir/docker-compose.prod.yml up -d --no-deps n8n
   ```

### 3.3 Menggunakan Environment Variables di Workflow

Di workflow nodes, environment variables diakses dengan syntax `{{ $env.VARIABLE_NAME }}`.

Contoh di HTTP Request node:
```
Authorization: key={{ $env.FCM_SERVER_KEY }}
```

---

## 4. Workflow: Payment Creation

**File:** `n8n/payment-creation.json`  
**Nama:** `Al Fakhir - Payment Creation Notification`

### Tujuan

Mengirim push notification FCM ke **orang tua** ketika tagihan baru dibuat oleh admin.

### Flow Diagram

```
[Webhook: POST /webhook/payment-created]
         │
         ▼
[Format Payment Data]
  - Format nominal ke Rupiah
  - Format tanggal jatuh tempo
  - Extract FCM token orang tua
         │
         ▼
[Send FCM Notification]
  - Title: "Tagihan Baru - {jenis}"
  - Body: "Tagihan {nominal} untuk {nama}. Jatuh tempo: {tanggal}"
  - Data: type, siswa_id, kode_va
         │
         ▼
[Respond: {"success": true}]
```

### Webhook URL

```
POST https://n8n.alfakhirschool.id/webhook/payment-created
```

### Request Payload (dikirim dari backend)

```json
{
  "siswa_id": "uuid-siswa",
  "nama_siswa": "Ahmad Rizky",
  "jenis_pembayaran": "SPP",
  "nominal": 500000,
  "kode_va": "8808001234567",
  "tanggal_jatuh_tempo": "2025-07-10T00:00:00.000Z",
  "fcm_token_ortu": "device-fcm-token-orang-tua"
}
```

### Notification yang Diterima Orang Tua

```
Judul: Tagihan Baru - SPP
Isi: Tagihan Rp 500.000 untuk Ahmad Rizky. Jatuh tempo: 10 Juli 2025
Data: {"type": "payment_created", "siswa_id": "...", "kode_va": "..."}
```

---

## 5. Workflow: Payment Confirmation

**File:** `n8n/payment-confirmation.json`  
**Nama:** `Al Fakhir - Payment Confirmation`

### Tujuan

Mengirim push notification FCM ke **siswa** dan **orang tua** ketika pembayaran dikonfirmasi admin.

### Flow Diagram

```
[Webhook: POST /webhook/payment-confirmed]
         │
         ▼
[Format Confirmation]
  - Format nominal ke Rupiah
  - Format tanggal bayar
  - Buat pesan untuk siswa dan orang tua
         │
         ▼
[Has Siswa Token?] ─── YES ──▶ [Notify Siswa (FCM)]
         │                              │
         │                              ▼
         └─── NO ──────────────▶ [Notify Orang Tua (FCM)]
                                        │
                                        ▼
                                 [Respond: {success: true}]
```

### Webhook URL

```
POST https://n8n.alfakhirschool.id/webhook/payment-confirmed
```

### Request Payload

```json
{
  "id": "uuid-pembayaran",
  "nama_siswa": "Ahmad Rizky",
  "jenis_pembayaran": "SPP",
  "nominal": 500000,
  "tanggal_bayar": "2025-06-12T10:30:00.000Z",
  "fcm_token_siswa": "device-fcm-token-siswa",
  "fcm_token_ortu": "device-fcm-token-orang-tua"
}
```

### Notifications yang Dikirim

**Ke Siswa:**
```
Judul: Pembayaran Dikonfirmasi ✓
Isi: Pembayaran SPP sebesar Rp 500.000 telah dikonfirmasi. Terima kasih!
```

**Ke Orang Tua:**
```
Judul: Tagihan Lunas ✓
Isi: Tagihan SPP Rp 500.000 untuk Ahmad Rizky telah LUNAS per 12 Juni 2025.
```

---

## 6. Workflow: Overdue Reminder

**File:** `n8n/overdue-reminder.json`  
**Nama:** `Al Fakhir - Overdue Payment Reminder`

### Tujuan

Setiap hari jam 08:00, secara otomatis mengirim reminder ke **orang tua** yang memiliki tagihan terlambat.

### Flow Diagram

```
[Schedule Trigger: Daily at 08:00]
         │
         ▼
[GET /api/pembayaran?status=belum&overdue=true]
  - Auth: Bearer token
         │
         ▼
[Filter & Format Overdue]
  - Filter hanya yang melewati tanggal jatuh tempo
  - Hitung jumlah hari terlambat
  - Format nominal ke Rupiah
         │
         ▼ (untuk setiap item)
[Has FCM Token?] ─── YES ──▶ [Send Overdue Reminder FCM]
         │                              │
         └─── NO ──▶ (skip)             ▼
                                 [Log Results]
```

### Jadwal

- Trigger: Daily (setiap 24 jam)
- Waktu default: tergantung kapan workflow pertama kali diaktifkan
- Untuk set waktu spesifik (08:00 WIB), edit node "Daily at 08:00":
  1. Buka workflow
  2. Klik node "Daily at 08:00"
  3. Ubah ke **Cron** mode
  4. Set: `0 1 * * *` (01:00 UTC = 08:00 WIB)

### Notification yang Dikirim ke Orang Tua

```
Judul: ⚠️ Tagihan Terlambat 5 Hari
Isi: Tagihan SPP Rp 500.000 untuk Ahmad Rizky sudah melewati jatuh tempo. 
     Segera lakukan pembayaran.
Data: {"type": "payment_overdue", "pembayaran_id": "...", "kode_va": "..."}
Priority: high (Android)
Channel: payment_reminder
```

### Environment Variables yang Dibutuhkan

Pada node "Get Overdue Payments", URL menggunakan `$env.BACKEND_URL`:
- Set `BACKEND_URL=http://backend:3001` di environment N8N

Di `docker-compose.prod.yml`, tambahkan ke service n8n:
```yaml
environment:
  BACKEND_URL: http://backend:3001
  BACKEND_INTERNAL_TOKEN: <token_dari_backend>
```

---

## 7. Testing Workflows

### Test Payment Creation Workflow

```bash
# Test dengan curl
curl -s -X POST https://n8n.alfakhirschool.id/webhook/payment-created \
  -H "Content-Type: application/json" \
  -d '{
    "siswa_id": "test-uuid",
    "nama_siswa": "Test Siswa",
    "jenis_pembayaran": "SPP",
    "nominal": 500000,
    "kode_va": "8808001234567",
    "tanggal_jatuh_tempo": "2025-07-31T00:00:00.000Z",
    "fcm_token_ortu": "test_fcm_token"
  }'
```

**Expected response:**
```json
{"success": true, "message": "Notification sent"}
```

### Test Payment Confirmation Workflow

```bash
curl -s -X POST https://n8n.alfakhirschool.id/webhook/payment-confirmed \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-pembayaran-uuid",
    "nama_siswa": "Test Siswa",
    "jenis_pembayaran": "SPP",
    "nominal": 500000,
    "tanggal_bayar": "2025-06-12T10:00:00.000Z",
    "fcm_token_siswa": "test_siswa_token",
    "fcm_token_ortu": "test_ortu_token"
  }'
```

### Test Manual di N8N UI

1. Buka workflow di N8N editor
2. Klik node pertama (Webhook)
3. Klik **Listen For Test Event**
4. Kirim request curl (dari contoh di atas)
5. Data akan muncul di node
6. Klik **Execute Workflow** untuk jalankan manual

### Test Overdue Reminder (Manual)

1. Buka workflow `overdue-reminder`
2. Klik node "Daily at 08:00"
3. Klik **Execute Node** untuk trigger manual
4. Lihat data di node berikutnya

---

## 8. Webhook URLs Configuration

Tambahkan webhook URLs ke backend `.env` agar backend bisa memanggil N8N:

```bash
# Edit .env
nano ~/alfakhir/.env

# Tambahkan atau update:
N8N_WEBHOOK_PAYMENT_CREATED=http://n8n:5678/webhook/payment-created
N8N_WEBHOOK_PAYMENT_CONFIRMED=http://n8n:5678/webhook/payment-confirmed
```

> **Catatan:** Gunakan hostname `n8n` (bukan `localhost` atau domain publik) karena backend dan N8N berada dalam Docker network yang sama (`alfakhir_net`).

### Restart Backend Setelah Update .env

```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Verifikasi Koneksi Backend ke N8N

```bash
# Test koneksi dari backend container ke N8N
docker exec alfakhir_backend wget -q -O - http://n8n:5678/healthz 2>/dev/null || echo "N8N not reachable"
```

---

## 9. Monitoring Workflow Executions

### Via N8N Web UI

1. Login ke https://n8n.alfakhirschool.id
2. Klik **Executions** di menu kiri
3. Filter berdasarkan:
   - **Status:** All / Success / Error / Running
   - **Workflow:** pilih workflow tertentu
   - **Time Range:** pilih rentang waktu

### Execution Status Icons

| Icon | Status | Arti |
|------|--------|------|
| Hijau ✓ | Success | Workflow berhasil |
| Merah ✗ | Error | Workflow gagal |
| Kuning ⟳ | Running | Sedang berjalan |
| Abu-abu | Waiting | Menunggu trigger |

### Lihat Detail Error

1. Klik eksekusi yang merah
2. Klik node yang gagal (merah)
3. Lihat tab **Input** dan **Output** untuk detail data
4. Lihat error message di panel kanan

### Via Log Docker

```bash
# N8N logs
docker logs alfakhir_n8n --since "1h" 2>&1 | grep -iE "error|warn|execution"

# Lihat semua executions via log
docker logs alfakhir_n8n --since "24h" 2>&1 | grep -i "execution"
```

### Metrics yang Perlu Dipantau

| Metric | Target | Alert Jika |
|--------|--------|------------|
| Success rate payment-creation | > 95% | < 90% |
| Success rate payment-confirmation | > 95% | < 90% |
| Overdue reminder executions/day | 1x/hari | 0 atau > 2 |
| Execution time per workflow | < 5 detik | > 30 detik |

---

## 10. Troubleshooting N8N

### Problem: Workflow tidak aktif (inactive)

**Symptom:** Webhook tidak merespons meski container running

**Fix:**
1. Buka N8N UI
2. Klik workflow
3. Pastikan toggle di kanan atas = **hijau** (Active)
4. Klik **Save** jika perlu

### Problem: Webhook returns 404

**Symptom:** `curl: (22) The requested URL returned error: 404`

**Cause:** Webhook path salah atau workflow belum diaktifkan.

**Fix:**
```bash
# Verifikasi URL webhook di N8N
# Buka workflow → klik Webhook node → lihat "Webhook URL" yang ditampilkan

# Pastikan production URL (bukan test URL)
# Test URL:       https://n8n.alfakhirschool.id/webhook-test/payment-created
# Production URL: https://n8n.alfakhirschool.id/webhook/payment-created
```

### Problem: FCM notification tidak terkirim

**Symptom:** Workflow sukses tapi HP tidak menerima notifikasi

**Diagnosis:**
1. Lihat execution detail di N8N
2. Expand node "Send FCM Notification"
3. Lihat **Output** → cek `results[0].success`

**Fix — Response error dari FCM:**
```json
{
  "error": {
    "message": "The registration token is not a valid FCM registration token",
    "status": "INVALID_ARGUMENT"
  }
}
```
Token FCM sudah kadaluarsa. User perlu login ulang di mobile app.

```json
{
  "error": {
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```
FCM_SERVER_KEY salah. Perbarui di `.env` dan restart N8N.

### Problem: Overdue reminder tidak berjalan

**Symptom:** Tidak ada eksekusi di hari tertentu

**Fix:**
1. Cek N8N container running:
   ```bash
   docker ps | grep n8n
   ```
2. Cek timezone N8N (default UTC, mungkin salah jam):
   ```bash
   docker exec alfakhir_n8n date
   ```
3. Adjust cron di workflow jika timezone berbeda

### Problem: N8N tidak bisa akses backend API

**Symptom:** Node "Get Overdue Payments" error dengan `ECONNREFUSED`

**Fix:**
```bash
# Test koneksi dari N8N container ke backend
docker exec alfakhir_n8n wget -q -O - http://backend:3001/api/health

# Pastikan keduanya di network yang sama
docker network inspect alfakhir_net | grep -E "alfakhir_n8n|alfakhir_backend"
```

### Problem: N8N database error saat startup

**Symptom:** `Error: database "n8n" does not exist`

**Fix:**
```bash
# Buat database n8n di postgres
docker exec alfakhir_postgres psql -U alfakhir -c \
  "CREATE DATABASE n8n OWNER alfakhir;"

# Restart N8N
docker compose -f ~/alfakhir/docker-compose.prod.yml restart n8n
```
