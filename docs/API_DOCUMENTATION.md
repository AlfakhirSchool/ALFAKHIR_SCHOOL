# Al Fakhir School LMS — API Documentation

**Base URL (Production):** `https://api.alfakhirschool.id/api`  
**Base URL (Local dev):** `http://localhost:3001/api`  
**Version:** 1.0 | **Auth:** JWT Bearer Token | **Format:** JSON

---

## Authentication

All endpoints except `POST /auth/login` require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens expire in **1 hour**. Use the refresh endpoint to get a new token without re-login.

### Roles & Permissions

| Role    | Access Level |
|---------|-------------|
| `admin` | Full access to all endpoints |
| `guru`  | Own data + kelas yang diajar |
| `siswa` | Own profile, nilai, jadwal, pembayaran |
| `ortu`  | Anak's nilai, jadwal, pembayaran |

---

## Rate Limiting

| Endpoint Pattern | Limit |
|-----------------|-------|
| `POST /auth/login` | 5 requests/minute |
| All other endpoints | 30 requests/minute |

Rate limit response: `HTTP 429 Too Many Requests`

```json
{ "error": "Too many requests", "retryAfter": 60 }
```

---

## Standard Response Format

**Success:**
```json
{
  "status": "success",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Deskripsi error",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Pagination

Endpoints returning lists support:

```
GET /siswa?page=1&limit=20&search=Ahmad&sortBy=nama&sortOrder=asc
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number |
| `limit` | 20 | Items per page (max 100) |
| `search` | — | Full-text search |
| `sortBy` | `createdAt` | Field to sort by |
| `sortOrder` | `desc` | `asc` or `desc` |

---

## 1. Auth Endpoints

### POST /auth/login

Login dan dapatkan JWT token.

**No auth required**

**Request:**
```json
{
  "email": "admin@alfakhirschool.id",
  "password": "Admin@1234"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "516ff1b2-2fff-e6d2-789a-f36635906fa5",
      "email": "admin@alfakhirschool.id",
      "nama": "Administrator",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Response 401:**
```json
{ "status": "error", "message": "Email atau password salah" }
```

---

### POST /auth/refresh

Refresh access token tanpa re-login.

**Request:**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/logout

Invalidate refresh token.

**Auth required:** Yes

**Response 200:**
```json
{ "status": "success", "message": "Logout berhasil" }
```

---

### GET /auth/me

Get profil user yang sedang login.

**Auth required:** Yes

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "516ff1b2-2fff-e6d2-789a-f36635906fa5",
    "email": "admin@alfakhirschool.id",
    "nama": "Administrator",
    "role": "admin",
    "is_active": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /auth/change-password

Ganti password user yang sedang login.

**Auth required:** Yes

**Request:**
```json
{
  "currentPassword": "Admin@1234",
  "newPassword": "NewPass@5678"
}
```

**Response 200:**
```json
{ "status": "success", "message": "Password berhasil diubah" }
```

---

## 2. Dashboard

### GET /dashboard/admin

Dashboard ringkasan untuk admin.

**Auth required:** Yes (admin)

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "totalSiswa": 120,
    "totalGuru": 15,
    "totalKelas": 8,
    "pembayaranStats": {
      "lunas": 85,
      "belum_bayar": 30,
      "sebagian": 5,
      "totalNominal": 42500000
    },
    "absensiHariIni": { "hadir": 108, "sakit": 5, "izin": 4, "alpa": 3 },
    "recentActivity": [ ... ]
  }
}
```

---

### GET /dashboard/guru

Dashboard untuk guru.

**Auth required:** Yes (guru)

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "kelasDiajar": 3,
    "totalSiswa": 96,
    "absensiHariIni": { "hadir": 88, "tidak_hadir": 8 },
    "jadwalHariIni": [ { "kelas": "X IPA 1", "mapel": "Matematika", "jam": "07:00-08:30" } ],
    "nilaiPending": 12
  }
}
```

---

## 3. Siswa

### GET /siswa

Daftar semua siswa.

**Auth required:** Yes (admin, guru)  
**Query params:** `page`, `limit`, `search`, `kelas_id`, `sekolah_id`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "013f0f67-779f-3b16-86c6-04db150d12ea",
      "nisn": "0012345001",
      "nis": "SMA-001",
      "no_induk": "001",
      "tanggal_lahir": "2007-03-15",
      "alamat": "Jl. Siswa No. 1",
      "user": { "nama": "Ahmad Rizky Pratama", "email": "siswa1@alfakhirschool.id" },
      "kelas": { "id": "...", "nama": "X IPA 1" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 120 }
}
```

---

### POST /siswa

Tambah siswa baru.

**Auth required:** Yes (admin)

**Request:**
```json
{
  "email": "siswa_baru@alfakhirschool.id",
  "password": "TempPass@123",
  "nama": "Budi Santoso",
  "nisn": "0012345099",
  "nis": "SMA-099",
  "no_induk": "099",
  "kelas_id": "a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448",
  "tanggal_lahir": "2007-05-10",
  "alamat": "Jl. Merdeka No. 5"
}
```

**Response 201:**
```json
{ "status": "success", "data": { "id": "...", "nisn": "0012345099", ... } }
```

---

### GET /siswa/:id

Detail siswa by ID.

**Auth required:** Yes (admin, guru, siswa=own)

---

### PUT /siswa/:id

Update data siswa.

**Auth required:** Yes (admin)

---

### DELETE /siswa/:id

Hapus siswa (soft delete — set is_active=false).

**Auth required:** Yes (admin)

---

### GET /siswa/:id/profile

Profil lengkap siswa termasuk nilai, absensi, pembayaran.

**Auth required:** Yes

---

## 4. Guru

### GET /guru

Daftar semua guru.

**Auth required:** Yes (admin)

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "92afb435-ceb1-6630-e982-7f54330c59c9",
      "nip": "198501012010011001",
      "spesialisasi": "Matematika",
      "no_telp": "0812-1111-2222",
      "user": { "nama": "Bpk. Rizki Kurniawan, S.Pd", "email": "guru1@alfakhirschool.id" }
    }
  ]
}
```

---

### POST /guru

Tambah guru baru.

**Auth required:** Yes (admin)

**Request:**
```json
{
  "email": "guru_baru@alfakhirschool.id",
  "password": "TempPass@123",
  "nama": "Ibu Wati, S.Pd",
  "nip": "198901012015012003",
  "spesialisasi": "Biologi",
  "no_telp": "0812-3333-4444"
}
```

---

### GET /guru/:id

Detail guru.

---

### PUT /guru/:id

Update data guru.

---

### DELETE /guru/:id

Nonaktifkan guru.

---

## 5. Kelas

### GET /kelas

Daftar semua kelas.

**Auth required:** Yes

**Query params:** `sekolah_id`, `tingkat`, `tahun_ajaran`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448",
      "nama": "X IPA 1",
      "tingkat": 10,
      "tahun_ajaran": "2025/2026",
      "sekolah": { "nama": "SMA Islam Al Fakhir" },
      "wali_kelas": { "user": { "nama": "Bpk. Rizki Kurniawan, S.Pd" } },
      "jumlah_siswa": 32
    }
  ]
}
```

---

### POST /kelas

Buat kelas baru.

**Auth required:** Yes (admin)

**Request:**
```json
{
  "sekolah_id": "488c1b08-c654-2b7a-1698-f4a8f29c4eb7",
  "nama": "X IPA 3",
  "tingkat": 10,
  "wali_kelas_id": "92afb435-ceb1-6630-e982-7f54330c59c9",
  "tahun_ajaran": "2025/2026"
}
```

---

### GET /kelas/:id

Detail kelas + daftar siswa.

---

### PUT /kelas/:id

Update kelas.

---

### DELETE /kelas/:id

Hapus kelas.

---

## 6. Mata Pelajaran

### GET /mata-pelajaran

Daftar semua mata pelajaran.

**Response 200:**
```json
{
  "status": "success",
  "data": [
    { "id": "16d7a7f5-...", "nama": "Matematika", "kode": "MTK", "kkm": 75 }
  ]
}
```

---

### POST /mata-pelajaran

**Auth required:** Yes (admin)

**Request:** `{ "nama": "Kimia", "kode": "KIM", "kkm": 70 }`

---

### GET /mata-pelajaran/:id

---

### PUT /mata-pelajaran/:id

---

## 7. Jadwal Pelajaran

### GET /jadwal

Daftar jadwal pelajaran.

**Auth required:** Yes  
**Query params:** `kelas_id`, `guru_id`, `hari`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "3e360f79-...",
      "hari": "Senin",
      "jam_mulai": "07:00",
      "jam_selesai": "08:30",
      "ruangan": "Ruang A1",
      "kelas": { "nama": "X IPA 1" },
      "mata_pelajaran": { "nama": "Matematika", "kode": "MTK" },
      "guru": { "user": { "nama": "Bpk. Rizki Kurniawan, S.Pd" } }
    }
  ]
}
```

---

### POST /jadwal

**Auth required:** Yes (admin)

**Request:**
```json
{
  "kelas_id": "a53fa2bc-...",
  "mata_pelajaran_id": "16d7a7f5-...",
  "guru_id": "92afb435-...",
  "hari": "Senin",
  "jam_mulai": "07:00",
  "jam_selesai": "08:30",
  "ruangan": "Ruang A1"
}
```

---

### GET /jadwal/:id

---

### DELETE /jadwal/:id

---

## 8. Absensi

### POST /absensi

Input absensi siswa.

**Auth required:** Yes (guru)

**Request:**
```json
{
  "kelas_id": "a53fa2bc-...",
  "mata_pelajaran_id": "16d7a7f5-...",
  "tanggal": "2025-09-01",
  "records": [
    { "siswa_id": "013f0f67-...", "status": "hadir", "keterangan": "" },
    { "siswa_id": "331633a2-...", "status": "sakit", "keterangan": "Demam" }
  ]
}
```

**Status values:** `hadir` | `sakit` | `izin` | `alpa`

---

### GET /absensi

Daftar absensi.

**Query params:** `kelas_id`, `siswa_id`, `tanggal_mulai`, `tanggal_selesai`, `mata_pelajaran_id`

---

### GET /absensi/stats

Statistik kehadiran.

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "periode": "2025-08-01 to 2025-12-31",
    "kelas": "X IPA 1",
    "stats": [
      {
        "siswa_id": "013f0f67-...",
        "nama": "Ahmad Rizky Pratama",
        "hadir": 85,
        "sakit": 3,
        "izin": 1,
        "alpa": 0,
        "persentase_hadir": 95.5
      }
    ]
  }
}
```

---

### GET /absensi/guru-summary

Rekap absensi per guru untuk verifikasi.

---

### PUT /absensi/:id

Update record absensi.

---

### DELETE /absensi/:id

Hapus record absensi.

---

## 9. Nilai

### POST /nilai

Input nilai siswa.

**Auth required:** Yes (guru)

**Request:**
```json
{
  "siswa_id": "013f0f67-...",
  "mata_pelajaran_id": "16d7a7f5-...",
  "semester": 1,
  "tahun_ajaran": "2025/2026",
  "kuis": 80,
  "tugas": 85,
  "uts": 78,
  "uas": 82
}
```

Nilai akhir dihitung otomatis: `kuis×10% + tugas×15% + uts×25% + uas×50%`

**Response 201:**
```json
{
  "status": "success",
  "data": {
    "id": "084e6596-...",
    "nilai_akhir": 81.5,
    "grade": "B",
    "predikat": "Baik"
  }
}
```

---

### GET /nilai

Daftar nilai.

**Query params:** `siswa_id`, `kelas_id`, `mata_pelajaran_id`, `semester`, `tahun_ajaran`

---

### GET /nilai/rekap

Rekap nilai per kelas per semester.

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "kelas": "X IPA 1",
    "semester": 1,
    "rekap": [
      {
        "siswa": "Ahmad Rizky Pratama",
        "nilai": [
          { "mapel": "Matematika", "nilai_akhir": 81.5, "grade": "B" },
          { "mapel": "Bahasa Indonesia", "nilai_akhir": 87, "grade": "A" }
        ],
        "rata_rata": 84.25
      }
    ]
  }
}
```

---

### GET /nilai/siswa/:id

Semua nilai seorang siswa.

---

## 10. Pembayaran

### GET /pembayaran

Daftar pembayaran.

**Auth required:** Yes (admin, ortu=own anak, siswa=own)  
**Query params:** `siswa_id`, `status`, `tahun_ajaran`, `jenis_biaya`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "4cab002c-...",
      "jenis_biaya": "SPP Semester 1",
      "nominal_biaya": 500000,
      "status": "lunas",
      "virtual_account": "8800001001",
      "va_bank": "bca",
      "tanggal_jatuh_tempo": "2025-06-10",
      "tanggal_bayar": "2025-06-05",
      "siswa": { "user": { "nama": "Ahmad Rizky Pratama" } }
    }
  ]
}
```

**Status values:** `belum_bayar` | `sebagian` | `lunas`

---

### POST /pembayaran

Buat tagihan pembayaran baru.

**Auth required:** Yes (admin)

**Request:**
```json
{
  "siswa_id": "013f0f67-...",
  "tahun_ajaran": "2025/2026",
  "jenis_biaya": "SPP Semester 2",
  "nominal_biaya": 500000,
  "virtual_account": "8800001003",
  "va_bank": "bca",
  "tanggal_jatuh_tempo": "2025-12-10"
}
```

---

### PUT /pembayaran/:id/confirm

Konfirmasi pembayaran (mark as lunas).

**Auth required:** Yes (admin)

**Request:**
```json
{
  "status": "lunas",
  "nominal_dibayar": 500000,
  "tanggal_bayar": "2025-09-01",
  "bukti_pembayaran": "bukti_001.jpg"
}
```

---

### GET /pembayaran/stats

Statistik pembayaran untuk dashboard.

---

### GET /pembayaran/siswa/:id

Semua pembayaran seorang siswa.

---

### GET /pembayaran/export

Export laporan pembayaran ke CSV.

**Query params:** `tahun_ajaran`, `bulan`, `format=csv`

---

## 11. Jurnal Mengajar

### GET /jurnal

Daftar jurnal mengajar.

**Auth required:** Yes (admin, guru=own)  
**Query params:** `guru_id`, `kelas_id`, `tanggal_mulai`, `tanggal_selesai`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "...",
      "tanggal": "2025-09-01",
      "kelas": { "nama": "X IPA 1" },
      "mata_pelajaran": { "nama": "Matematika" },
      "materi": "Fungsi Kuadrat",
      "kegiatan": "Penjelasan teori + latihan soal",
      "ttd_guru": "data:image/png;base64,...",
      "guru": { "user": { "nama": "Bpk. Rizki Kurniawan, S.Pd" } }
    }
  ]
}
```

---

### POST /jurnal

Buat jurnal baru.

**Auth required:** Yes (guru)

**Request:**
```json
{
  "tanggal": "2025-09-02",
  "kelas_id": "a53fa2bc-...",
  "mata_pelajaran_id": "16d7a7f5-...",
  "materi": "Fungsi Trigonometri",
  "kegiatan": "Diskusi kelompok + presentasi",
  "ttd_guru": "data:image/png;base64,..."
}
```

---

### GET /jurnal/:id

---

### PUT /jurnal/:id

---

### DELETE /jurnal/:id

---

## 12. Rapor

### GET /rapor/kelas/:id

Rapor semua siswa dalam satu kelas.

**Auth required:** Yes (admin, guru)  
**Query params:** `semester`, `tahun_ajaran`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "siswa_id": "013f0f67-...",
      "nama": "Ahmad Rizky Pratama",
      "semester": 1,
      "tahun_ajaran": "2025/2026",
      "nilai_rata_rata": 84.25,
      "ranking": 1,
      "nilai_per_mapel": [
        { "mapel": "Matematika", "nilai_akhir": 81.5, "grade": "B" }
      ]
    }
  ]
}
```

---

### POST /rapor/generate

Generate/hitung ulang rapor untuk satu kelas.

**Auth required:** Yes (admin)

**Request:**
```json
{
  "kelas_id": "a53fa2bc-...",
  "semester": 1,
  "tahun_ajaran": "2025/2026"
}
```

**Response 200:**
```json
{
  "status": "success",
  "message": "Rapor berhasil digenerate untuk 32 siswa",
  "data": { "generated": 32, "errors": 0 }
}
```

---

### GET /rapor/siswa/:id

Rapor seorang siswa.

**Auth required:** Yes (admin, guru, siswa=own, ortu=own anak)

---

## 13. Audit Log

### GET /audit-log

Log aktivitas sistem.

**Auth required:** Yes (admin only)  
**Query params:** `table_name`, `action`, `user_id`, `date_from`, `date_to`, `page`, `limit`

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "...",
      "table_name": "pembayaran",
      "record_id": "4cab002c-...",
      "action": "UPDATE",
      "old_values": { "status": "belum_bayar" },
      "new_values": { "status": "lunas" },
      "user": { "nama": "Administrator", "email": "admin@alfakhirschool.id" },
      "ip_address": "192.168.1.10",
      "createdAt": "2025-09-01T09:30:00.000Z"
    }
  ]
}
```

**Action values:** `CREATE` | `UPDATE` | `DELETE`

---

### GET /audit-log/stats

Statistik aktivitas per periode.

**Auth required:** Yes (admin)

---

### GET /audit-log/export

Export audit log ke CSV.

---

## 14. Notifikasi

### POST /notifikasi/fcm-token

Daftarkan FCM token perangkat untuk push notifications.

**Auth required:** Yes

**Request:**
```json
{
  "fcm_token": "dXj89...:APA91bHPR...",
  "device_info": {
    "platform": "android",
    "model": "Samsung Galaxy A52",
    "app_version": "1.0.0"
  }
}
```

---

### GET /notifikasi

Daftar notifikasi user yang sedang login.

**Auth required:** Yes

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "...",
      "judul": "Tagihan SPP",
      "pesan": "SPP Semester 2 jatuh tempo 10 Des 2025",
      "tipe": "pembayaran",
      "is_read": false,
      "createdAt": "2025-09-01T08:00:00.000Z"
    }
  ],
  "meta": { "unread": 3 }
}
```

---

### PUT /notifikasi/:id/read

Mark notifikasi sebagai sudah dibaca.

**Auth required:** Yes

**Response 200:**
```json
{ "status": "success", "message": "Notifikasi ditandai sudah dibaca" }
```

---

## 15. System

### GET /health

Health check endpoint. **No auth required.**

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-01T08:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "uptime": 86400
}
```

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email/password salah |
| `TOKEN_EXPIRED` | 401 | JWT token kadaluarsa |
| `TOKEN_INVALID` | 401 | Token tidak valid |
| `INSUFFICIENT_ROLE` | 403 | Role tidak punya akses |
| `RESOURCE_NOT_FOUND` | 404 | Data tidak ditemukan |
| `DUPLICATE_ENTRY` | 409 | Data sudah ada (unique constraint) |
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `RATE_LIMIT_EXCEEDED` | 429 | Terlalu banyak request |
| `INTERNAL_ERROR` | 500 | Error server |

---

## Quick Start Examples

### Login & get token
```bash
TOKEN=$(curl -s -X POST https://api.alfakhirschool.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' \
  | jq -r '.data.accessToken')
```

### Get siswa list
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.alfakhirschool.id/api/siswa?page=1&limit=10"
```

### Input nilai
```bash
curl -X POST https://api.alfakhirschool.id/api/nilai \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siswa_id": "013f0f67-779f-3b16-86c6-04db150d12ea",
    "mata_pelajaran_id": "16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd",
    "semester": 1,
    "tahun_ajaran": "2025/2026",
    "kuis": 80, "tugas": 85, "uts": 78, "uas": 82
  }'
```

### Generate rapor
```bash
curl -X POST https://api.alfakhirschool.id/api/rapor/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kelas_id":"a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448","semester":1,"tahun_ajaran":"2025/2026"}'
```

---

## Postman Collection

Import file: `docs/postman-collection.json`

Set variable:
- `base_url`: `https://api.alfakhirschool.id/api`
- `token`: (auto-set setelah login)

---

*Support: smpislamalfakhir@gmail.com | Versi dokumen: 2025-06-13*
