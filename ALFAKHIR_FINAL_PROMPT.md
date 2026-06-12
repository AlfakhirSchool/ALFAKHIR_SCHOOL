# 🏫 AL FAKHIR SCHOOL - LEARNING MANAGEMENT SYSTEM
## FINAL MASTER PROMPT FOR CLAUDE CODE

**Version:** 2.0 (FINAL - Confirmed Architecture)  
**Status:** Ready for Development  
**Timeline:** 4 Weeks to MVP  
**Last Updated:** January 2025

---

## 📋 EXECUTIVE SUMMARY

**Project:** Complete Learning Management System for Al Fakhir School (SD/SMP/SMA Islamic Modern)  
**Target Users:** 1500+ (students, teachers, parents, admin)  
**Go-Live Date:** 1 month from start

**FINAL PLATFORM ARCHITECTURE:**
```
┌─────────────────────────────────────────┐
│         SISWA (Student)                 │
│  ➜ Mobile App (Flutter Android)         │
│  ➜ Google Play Store                    │
│  ➜ Screens: Login, Grades, Attendance,  │
│    Schedule, Payment, Learning Topics   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         GURU (Teacher)                  │
│  ➜ Web Dashboard (Next.js)              │
│  ➜ Browser access (responsive)          │
│  ➜ Features: QR Attendance, Input Nilai,│
│    Jurnal Guru, My Classes, Schedule    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    ORANG TUA (Parent)                   │
│  ➜ Mobile App (Flutter Android)         │
│    OR Web Dashboard (Next.js)           │
│  ➜ Screens: Child Profile, Attendance,  │
│    Grades, Payment, Learning Summary    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      ADMIN (Control Center)             │
│  ➜ Web Dashboard (Next.js)              │
│  ➜ Desktop/Browser access               │
│  ➜ Full Control: Users, Classes,        │
│    Reports, Payments, Jurnal Monitoring │
└─────────────────────────────────────────┘
```

**APPLICATIONS TO BUILD:**
1. ✅ Siswa Mobile App (Flutter Android)
2. ✅ Guru Web Dashboard (Next.js + Vercel)
3. ✅ Admin Web Dashboard (Next.js + Vercel)
4. ✅ Orang Tua Mobile App (Flutter Android)
5. ✅ Backend API (Express.js on Proxmox)

---

## 🎨 BRANDING SYSTEM

### Colors (3 Jenjang Variants)
```
SMA Islam Modern Al Fakhir
├─ Primary: #3B7FD1 (Blue)
├─ Accent: #FF8C42 (Orange)
└─ Logo: Star/gem with book

SMP Islam Modern Al Fakhir
├─ Primary: #1B8B87 (Teal)
├─ Accent: #FF8C42 (Orange)
└─ Logo: Star/gem with book

SD Islam Modern Al Fakhir
├─ Primary: #FF8C42 (Orange)
├─ Accent: Navy/Teal
└─ Logo: Star/gem with book
```

### Unified Palette
```
Primary Colors:
├─ Blue: #3B7FD1 (SMA)
├─ Teal: #1B8B87 (SMP)
├─ Orange: #FF8C42 (SD + Accent for all)
└─ Navy: #1A2332 (Text, headers)

Semantic:
├─ Success: #10B981 (Green - attendance)
├─ Warning: #F59E0B (Amber - pending)
├─ Error: #EF4444 (Red - overdue)
└─ Info: #3B7FD1 (Blue - information)

Backgrounds:
├─ Light: #F5F5F5 (Gray)
└─ White: #FFFFFF (Clean)
```

### Logo Placement
```
Web Dashboard Header: 40x40px
Login Page: 150x150px (centered)
PDF Rapor: 40x40px (top-left)
Mobile App Bar: 40x40dp
Mobile Splash: 120x120px
Email Templates: 50x50px
```

---

## 🗄️ DATABASE SCHEMA (13 TABLES)

### 1. Authentication & Users
```sql
users (id, email, password_hash, nama, role, is_active, profile_pic, created_at)
-- Roles: admin, guru, siswa, ortu
```

### 2. Organization Structure
```sql
sekolah (id, nama, level) -- SD, SMP, SMA
kelas (id, sekolah_id, nama, tingkat, wali_kelas_id, tahun_ajaran)
mata_pelajaran (id, nama, kode, kkm)
```

### 3. User Details
```sql
siswa (id, user_id, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat)
guru (id, user_id, nip, spesialisasi, no_telp)
orang_tua (id, user_id, siswa_id, hubungan, no_telp)
```

### 4. Academic Schedule
```sql
jadwal_pelajaran (id, kelas_id, guru_id, mata_pelajaran_id, hari, jam_mulai, jam_selesai, ruangan)
```

### 5. Attendance Management
```sql
absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, waktu_hadir, status, qr_code_scanned, input_code, catatan, created_by, created_at)
-- Status: hadir, sakit, izin, alfa

qr_code_session (id, jadwal_pelajaran_id, tanggal, unique_code, qr_data, aktif, waktu_mulai, waktu_selesai)
```

### 6. Grades Management
```sql
nilai (id, siswa_id, mata_pelajaran_id, guru_id, semester, tahun_ajaran, kuis, tugas, uts, uas, nilai_akhir, grade, predikat, catatan, input_date, update_date)
-- Auto-calculate: nilai_akhir = (kuis×10% + tugas×15% + UTS×25% + UAS×50%)
-- Grade: A(85+), B(75-84), C(65-74), D(55-64), E(<55)
```

### 7. Payment System
```sql
pembayaran (id, siswa_id, tahun_ajaran, jenis_biaya, nominal_biaya, nominal_terbayar, status, virtual_account, va_bank, tanggal_jatuh_tempo, tanggal_bayar, metode_bayar, bukti_bayar, created_at, updated_at)
-- Status: belum_bayar, sebagian, lunas
-- va_bank: bca, mandiri

pembayaran_detail (id, pembayaran_id, nominal_bayar, tanggal_bayar, bank, reference_number, created_at)
```

### 8. Reports
```sql
rapor (id, siswa_id, semester, tahun_ajaran, jumlah_hadir, jumlah_sakit, jumlah_izin, jumlah_alfa, nilai_rata_rata, ranking, pdf_file, generated_at)
```

### 9. Teacher Journal
```sql
jurnal_guru (id, guru_id, wali_kelas_id, kelas_id, mata_pelajaran_id, tanggal, hari, jam_mulai, jam_selesai, topik_pelajaran, metode_pembelajaran, deskripsi_pembelajaran, hasil_pembelajaran, hambatan_pembelajaran, rencana_tindak_lanjut, media_pembelajaran, sumber_belajar, jumlah_siswa_hadir, jumlah_siswa_sakit, jumlah_siswa_izin, jumlah_siswa_alfa, ttd_guru, signed_at, ttd_wali_kelas, wali_kelas_signed_at, status, created_at, updated_at, deleted_at)
-- Status: draft, submitted, reviewed, approved

jurnal_siswa_detail (id, jurnal_guru_id, siswa_id, status, catatan_siswa, created_at)

jurnal_lampiran (id, jurnal_guru_id, file_path, file_name, file_type, file_size, deskripsi, uploaded_by, uploaded_at)

jurnal_history (id, jurnal_guru_id, action, old_data, new_data, changed_by, changed_at)
```

### 10. Audit Log
```sql
activity_log (id, user_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent, created_at)
```

---

## 🔌 API ENDPOINTS (55+ Total)

### Authentication (5)
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/profile
POST   /api/auth/change-password
```

### Users (10)
```
GET    /api/siswa (filters: kelas_id, tahun_ajaran)
POST   /api/siswa
GET    /api/siswa/:id
PUT    /api/siswa/:id
DELETE /api/siswa/:id
GET    /api/guru
POST   /api/guru
GET    /api/guru/:id
PUT    /api/guru/:id
DELETE /api/guru/:id
```

### Classes & Subjects (8)
```
GET    /api/kelas
POST   /api/kelas
GET    /api/kelas/:id/siswa
GET    /api/kelas/:id/jadwal
GET    /api/mata-pelajaran
POST   /api/mata-pelajaran
GET    /api/jadwal-pelajaran
POST   /api/jadwal-pelajaran
```

### Attendance (8)
```
POST   /api/absensi/qr-session/create
POST   /api/absensi/qr-session/:id/close
POST   /api/absensi/scan-qr
POST   /api/absensi/input-code
POST   /api/absensi/manual
PUT    /api/absensi/:id
GET    /api/absensi/laporan
GET    /api/absensi/:siswa_id/detail
```

### Grades (6)
```
POST   /api/nilai
GET    /api/nilai/:siswa_id
PUT    /api/nilai/:id
DELETE /api/nilai/:id
GET    /api/nilai/laporan
GET    /api/nilai/export/excel
```

### Payments (6)
```
GET    /api/pembayaran
POST   /api/pembayaran
POST   /api/pembayaran/:id/bayar
GET    /api/pembayaran/laporan
POST   /api/pembayaran/webhook/bca
POST   /api/pembayaran/webhook/mandiri
```

### Teacher Journal (12)
```
POST   /api/jurnal-guru
PUT    /api/jurnal-guru/:id
GET    /api/jurnal-guru/:id
GET    /api/jurnal-guru
DELETE /api/jurnal-guru/:id
POST   /api/jurnal-guru/:id/submit
POST   /api/jurnal-guru/:id/review
GET    /api/jurnal-guru/laporan/kelas/:id
GET    /api/jurnal-guru/laporan/siswa/:id
GET    /api/jurnal-guru/laporan/parent/:id
GET    /api/jurnal-guru/:id/export/pdf
GET    /api/jurnal-guru/export/excel
```

### Dashboard (4)
```
GET    /api/dashboard/admin
GET    /api/dashboard/guru
GET    /api/dashboard/parent
GET    /api/dashboard/student
```

---

## 🛠️ TECH STACK

### Backend
```
Runtime: Node.js 18+
Framework: Express.js + TypeScript
Database: PostgreSQL 14+
ORM: Sequelize / TypeORM
Authentication: jsonwebtoken + bcrypt
QR Generation: qrcode library
Email: Nodemailer
File Upload: Multer
Logging: winston
Validation: Joi
Testing: Jest
Environment: .env configuration
```

### Frontend - Guru & Admin Web Dashboard (Next.js)
```
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: TailwindCSS + shadcn/ui
State: Zustand
HTTP: React Query / SWR
Forms: React Hook Form + Zod
Charts: Recharts (KPI, trends)
PDF: jsPDF + html2canvas (rapor)
QR: jsQR + react-qr-reader (guru absensi)
Authentication: NextAuth.js
Deployment: Vercel
Environment: .env.local
```

### Mobile Apps (Flutter)
```
Framework: Flutter 3.19+
Language: Dart
State Management: Provider / Riverpod
HTTP Client: Dio
Local Storage: Hive (offline-first)
QR Scanning: qr_code_scanner
PDF Viewer: pdfx
Notifications: Firebase Cloud Messaging
Authentication: Secure token storage
Offline Support: Yes (cache + queue)
Distribution: Google Play Store

Apps:
├─ siswa_app/ (student app)
├─ orang_tua_app/ (parent app)
└─ flutter_common_lib/ (shared code)
```

### Infrastructure
```
Frontend Hosting: Vercel (Next.js)
Backend Server: Proxmox (Docker containers)
Database: PostgreSQL (with streaming replication)
Storage: MinIO (S3-compatible, Proxmox)
Automation: N8N (Proxmox Docker - payment workflows)
Backup: pgBackRest (database) + Restic (files)
Cloud: Backblaze B2 (free tier for backups)
Domain: Cloudflare DNS
SSL: Let's Encrypt (free)
```

---

## 🏗️ ARCHITECTURE

### 2-Location Disaster Recovery Setup
```
PRIMARY (Proxmox Server 1):
├─ Backend API (Express.js Docker)
├─ PostgreSQL Primary Database
├─ MinIO Object Storage
├─ N8N Automation Engine
├─ Redis Cache
└─ Nginx Reverse Proxy

SECONDARY (Proxmox Server 2):
├─ PostgreSQL Standby (streaming replication)
├─ MinIO Backup (daily sync)
├─ Cold standby (promote to primary if needed)
└─ Backup storage

Replication:
└─ PostgreSQL WAL streaming (real-time sync)
└─ Automatic failover on primary down
└─ Manual promotion for maintenance
```

### Payment Gateway Architecture
```
N8N Workflows (on Proxmox):

Workflow 1: Payment Creation
├─ Trigger: Pembayaran record created
├─ Action: Call BCA/Mandiri API → Generate VA
├─ Action: Store VA in database
├─ Action: Send email to parent
└─ Action: Send FCM notification

Workflow 2: Payment Confirmation
├─ Trigger: Webhook from BCA/Mandiri
├─ Action: Verify signature
├─ Action: Find matching pembayaran
├─ Action: Update status = 'lunas'
├─ Action: Send confirmation email
├─ Action: Send FCM notification
└─ Action: Log transaction

Workflow 3: Overdue Reminder
├─ Trigger: Daily 8 AM (cron)
├─ Action: Query overdue payments
└─ Action: Send reminder email to parents
```

### Backup Strategy (FREE)
```
Layer 1: Database (pgBackRest)
├─ Full backup: Weekly (Sunday 2 AM)
├─ Incremental: Daily (1 AM)
├─ Retention: 30 days rolling
└─ Location: Primary + Secondary + B2

Layer 2: Files (Restic)
├─ Daily 3 AM backup
├─ Includes configs, N8N workflows
├─ Deduplication enabled
└─ Cloud: B2 Free Tier (10GB free)

Layer 3: Code (GitHub)
├─ All source code committed
└─ Auto-push on deployment

Cost: ~$0.30/month for B2 overage (negligible)
```

---

## 📱 SISWA MOBILE APP (Flutter Android)

### Navigation Structure
```
Bottom Tab Bar (5 tabs):
├─ 🏠 Home
│  ├─ Attendance rate card
│  ├─ Average grade card
│  ├─ Payment status card
│  ├─ Today's schedule
│  ├─ Recent grades
│  └─ Quick payment status
│
├─ 📊 Grades
│  ├─ Current semester grades
│  ├─ Grade by subject (list)
│  ├─ Grade trend (chart)
│  └─ Download Rapor
│
├─ 📋 Attendance
│  ├─ Monthly summary (cards: hadir, sakit, izin, alfa)
│  ├─ Attendance trend (chart)
│  └─ Detailed history
│
├─ 📅 Schedule
│  ├─ This week schedule
│  ├─ Filter by subject
│  ├─ Teacher name & room
│  └─ Add to calendar
│
└─ 💰 Payment
   ├─ Payment status summary
   ├─ List of bills (color-coded: green=lunas, yellow=sebagian, red=belum)
   ├─ Payment history
   └─ Total tunggakan (if any)

Top Header:
├─ [Logo Al Fakhir 40x40]
├─ "Al Fakhir School"
├─ [User Profile ▼]
└─ [≡ Menu]

Side Menu:
├─ 🏠 Dashboard
├─ 👤 Profile
├─ ⚙️  Settings
├─ 📚 Learning Topics (from jurnal)
└─ 🚪 Logout
```

### Key Features
```
✓ Offline support (cache last data)
✓ FCM notifications (new grades, payment due, attendance alerts)
✓ Push to refresh, pull to sync
✓ Dark mode support
✓ Share rapor as PDF
✓ Contact teacher button
```

---

## 🌐 GURU WEB DASHBOARD (Next.js + Vercel)

### Navigation Structure
```
Sidebar (Left):
├─ 🏠 Dashboard
│  └─ KPI cards, today's classes
├─ 📊 Absensi
│  ├─ Select class, date, mata pelajaran
│  ├─ Generate QR + 6-digit code
│  ├─ Real-time attendance list
│  ├─ Manual input option
│  └─ Close session
├─ 📝 Nilai
│  ├─ Select subject, semester, tahun_ajaran
│  ├─ Batch input table (kuis, tugas, uts, uas)
│  ├─ Auto-calculate grades
│  └─ Submit
├─ 📓 Jurnal Guru
│  ├─ Today's classes (quick add)
│  ├─ Input form (topik, metode, hasil, hambatan)
│  ├─ Absensi detail (per siswa with notes)
│  ├─ Signature pad (canvas)
│  └─ Submit for approval
├─ 👥 My Classes
│  ├─ Class list
│  └─ View students
├─ 📅 My Schedule
│  ├─ Weekly view
│  ├─ By class
│  └─ By subject
├─ ⚙️  Settings
└─ 🚪 Logout

Top Header:
├─ [Logo Al Fakhir 40x40] "Guru Dashboard"
├─ Search bar
├─ [Notification Bell 🔔] (jurnal pending, grade confirmation)
└─ [Guru Name ▼] [🚪 Logout]

Responsive: Yes (works on tablet too)
```

### Key Features
```
✓ QR code generation & display
✓ 6-digit fallback code
✓ Real-time attendance updates
✓ Auto-calculate grades (instant feedback)
✓ Digital signature capture (canvas)
✓ Offline form drafts (save & submit later)
✓ FCM notifications (approval status)
```

---

## 🎛️ ADMIN WEB DASHBOARD (Next.js + Vercel)

### Navigation Structure
```
Sidebar (Left):
├─ 📊 Dashboard
│  ├─ KPI cards (total siswa, guru, kelas, mapel)
│  ├─ Charts (attendance trend, grade distribution, payment status)
│  ├─ Top/bottom performers
│  ├─ Recent activities
│  └─ Quick actions
├─ 👥 Users Management
│  ├─ Siswa (CRUD, bulk import CSV)
│  ├─ Guru (CRUD)
│  ├─ Orang Tua (CRUD)
│  └─ Add/Edit forms
├─ 📚 Classes
│  ├─ List by jenjang (SD/SMP/SMA)
│  ├─ Manage classes
│  ├─ View students in class
│  └─ Assign wali kelas
├─ 📖 Subjects
│  ├─ CRUD mata pelajaran
│  └─ Set KKM per subject
├─ 📋 Attendance
│  ├─ View all attendance
│  ├─ Filter by class, date range
│  ├─ Validate against jurnal
│  └─ Generate report
├─ 📊 Grades
│  ├─ View all grades
│  ├─ By subject, by class
│  ├─ Export to Excel
│  └─ Generate statistics
├─ 💰 Payments
│  ├─ View all pembayaran
│  ├─ Filter by status (belum, sebagian, lunas)
│  ├─ View tunggakan list
│  ├─ Payment laporan
│  └─ Export to Excel
├─ 📓 Jurnal Guru
│  ├─ Monitor submission status
│  ├─ View pending approvals
│  ├─ Generate compliance report
│  ├─ Export jurnal records
│  └─ Validate attendance vs QR
├─ 📄 Reports
│  ├─ Generate Rapor (batch or per siswa)
│  ├─ Monthly summary reports
│  ├─ Export as PDF/Excel
│  └─ Attendance reconciliation
├─ ⚙️  Settings
│  ├─ System configuration
│  ├─ Backup status
│  └─ Security settings
├─ 📜 Audit Log
│  ├─ View all changes
│  ├─ Filter by user, table
│  └─ Compliance documentation
└─ 🚪 Logout

Top Header:
├─ [Logo Al Fakhir 40x40] "Admin Control Center"
├─ Advanced search & filters
├─ [Notification Bell 🔔] (critical alerts)
├─ [System Health Status]
└─ [Admin Name ▼] [🚪 Logout]

Responsive: Desktop-optimized (full features on desktop)
```

### Key Features
```
✓ Comprehensive CRUD for all entities
✓ Advanced filtering & search
✓ Data validation & reconciliation
✓ Bulk operations (import/export)
✓ Real-time KPI dashboard
✓ Multiple report types
✓ Audit trail tracking
✓ Role-based access control
```

---

## 📱 ORANG TUA MOBILE APP (Flutter Android)

### Navigation Structure
```
Bottom Tab Bar (5 tabs):
├─ 🏠 Home
│  ├─ Child selector (if multiple kids)
│  ├─ Child profile
│  ├─ Quick stats (attendance %, avg grade)
│  ├─ Payment status (HIGHLIGHTED if overdue 🔴)
│  ├─ Recent grades
│  └─ This week schedule
│
├─ 📋 Attendance
│  ├─ Monthly summary
│  ├─ Attendance rate chart
│  └─ Detailed history
│
├─ 📊 Grades
│  ├─ Current semester grades
│  ├─ By subject breakdown
│  ├─ Grade history
│  └─ Download Rapor
│
├─ 💰 Payment
│  ├─ Bills list (HIGHLIGHTED red if overdue)
│  ├─ Total tunggakan (prominent display)
│  ├─ Payment history
│  └─ Payment method info
│
└─ 📚 Learning
   ├─ Topics covered this month (from jurnal)
   ├─ Teacher's notes about child
   ├─ Attendance trend
   └─ Learning progress summary

Top Header:
├─ [Logo Al Fakhir 40x40]
├─ "Pantau Anak Anda"
├─ [User Profile ▼]
└─ [≡ Menu]

Side Menu:
├─ 🏠 Dashboard
├─ 👤 Profile
├─ ⚙️  Settings
├─ 📞 Contact Teacher
└─ 🚪 Logout
```

### Key Features
```
✓ Multiple children support (sibling selector)
✓ Offline access to cached data
✓ FCM notifications (new grades, payment reminders, attendance alerts)
✓ Payment status prominently highlighted (red if overdue)
✓ Share grades/rapor with family
✓ Learning summary from teacher's journal
✓ Dark mode support
✓ Contact teacher direct message
```

---

## 🔐 PERMISSIONS & ACCESS CONTROL

### ADMIN
```
✓ All CRUD operations for all entities
✓ View all reports & analytics
✓ Manage system settings
✓ Approve/reject anything
✓ Export data in any format
✓ View audit logs
✓ Manage users & roles
✓ Configure payment settings
✓ Backup & restore
```

### GURU
```
✓ Create/edit own absensi (per class)
✓ Create/edit own nilai (per subject)
✓ Create/edit own jurnal
✓ View own students
✓ View own schedule
✓ View notifications
✗ Cannot delete records (soft delete admin only)
✗ Cannot view other gurus' data
✗ Cannot modify system settings
```

### WALI KELAS
```
✓ View all jurnal from gurus (their class)
✓ Review & approve jurnal
✓ Reject jurnal (send back to guru)
✓ Add catatan on jurnal
✓ Generate laporan per class
✓ Monitor submission rates
```

### SISWA
```
✓ View own grades, attendance, schedule, payment
✓ Download rapor
✓ View learning topics (from jurnal)
✗ Cannot edit anything
✗ Cannot view other students' data
```

### ORANG TUA
```
✓ View child's grades, attendance, schedule, payment
✓ View learning summary (from jurnal - no detailed access)
✓ Download child's rapor
✓ View attendance trends
✓ Receive payment reminders
✗ Cannot edit anything
✗ Cannot view detailed jurnal
✗ Cannot view other children's data (except own kids)
```

---

## 📅 4-WEEK DEVELOPMENT TIMELINE

### WEEK 1: BACKEND FOUNDATION + ABSENSI

**Days 1-2:**
- Express.js + TypeScript project setup
- PostgreSQL database schema (13 tables)
- Sequelize ORM models & migrations
- JWT authentication (login/logout/refresh)
- Role-based middleware
- Environment configuration (.env template)

**Days 3-4:**
- User CRUD (siswa, guru, orang tua, admin)
- Kelas & Mata Pelajaran CRUD
- Jadwal Pelajaran CRUD
- Wali Kelas assignment

**Days 5-7:**
- QR code generation (qrcode library)
- 6-digit unique code generation
- Attendance API endpoints (scan-qr, input-code, manual)
- Session management (qr_code_session)
- API testing (Postman collection)
- Docker setup (Dockerfile + docker-compose.yml)
- Database migrations ready

**DELIVERABLE:** Working backend API, production-ready database, Docker container ready to deploy

---

### WEEK 2: NILAI + PEMBAYARAN + DASHBOARDS

**Days 1-2:**
- Nilai CRUD + auto-calculation
  - Formula: (kuis×10% + tugas×15% + UTS×25% + UAS×50%)
  - Auto-assign grades (A/B/C/D/E)
- Rapor generation (PDF with jsPDF)
- Laporan API endpoints (by class, by student, by subject)

**Days 3-4:**
- Pembayaran CRUD + workflow
- Virtual Account generation (BCA/Mandiri API)
- N8N workflow setup (on Proxmox - 3 workflows)
- Payment webhook handlers (BCA/Mandiri)
- Payment notification system (email + FCM)

**Days 5-7:**
- Guru Web Dashboard (Next.js) - Build & deploy to Vercel
  - Login page with logo
  - Absensi screen (QR display + 6-digit)
  - Nilai input form
  - My Classes & Schedule
  - Profile & Settings
- Admin Web Dashboard (Next.js) - Build & deploy to Vercel
  - Dashboard with KPI cards & charts
  - User management pages
  - Attendance/Grades/Payment views
  - Report generation
- Connect dashboards to backend API

**DELIVERABLE:** Full nilai system, payment integration, web dashboards (Guru + Admin) live on Vercel

---

### WEEK 3: JURNAL GURU + FLUTTER APPS

**Days 1-2:**
- Jurnal Guru database & API
  - 4 tables (jurnal_guru, jurnal_siswa_detail, lampilan, history)
  - 12 endpoints (CRUD, submit, review, export)
- Digital signature handling (base64 encoding)
- Signature capture component
- Workflow management (draft → submitted → reviewed → approved)

**Days 3-4:**
- Siswa Mobile App (Flutter Android)
  - Project setup with common library
  - Authentication (JWT token storage)
  - 5 main screens (home, grades, attendance, schedule, payment)
  - Offline support (Hive cache)
  - FCM notifications
  - APK build setup
  
- Orang Tua Mobile App (Flutter Android)
  - Similar structure to Siswa app
  - Child selector (multiple kids)
  - Read-only screens
  - Payment status prominently highlighted
  - Learning topics display
  - APK build setup

**Days 5-7:**
- Guru Web Dashboard - Add Jurnal Guru screens
  - Input form (topik, metode, hasil, hambatan)
  - Absensi detail list
  - Signature capture
  - Submit for approval
- Wali Kelas review interface
  - Pending jurnal queue
  - Review & sign screen
  - Approval status tracking
- Firebase Cloud Messaging (FCM) setup
  - Token registration
  - Notification handling
  - Testing FCM
- Play Store preparation
  - APK signing (keystore creation)
  - App listings (3 apps)
  - Screenshots & descriptions

**DELIVERABLE:** 2 Flutter mobile apps + Jurnal Guru system, FCM notifications working, apps ready for Play Store

---

### WEEK 4: TESTING + DEPLOYMENT + GO-LIVE

**Days 1-2:**
- Integration testing
  - Login → Absensi → Nilai → Payment complete flow
  - Jurnal submission & approval workflow
  - Data consistency checks (absensi vs jurnal)
  - Load testing (1500 concurrent users)
- Security audit
  - SQL injection prevention
  - CORS configuration
  - Authentication edge cases
  - File upload validation
- Bug fixes & refinements

**Days 3-4:**
- Production deployment
  - Backend → Proxmox Docker (both locations)
  - PostgreSQL replication setup (primary + secondary)
  - MinIO configuration
  - N8N workflows deployment
  - Frontend → Vercel (auto-deployed already)
  - Apps → Google Play (internal testing)
  - DNS setup (Cloudflare)
  - SSL certificates (Let's Encrypt)
- Backup system activation
  - pgBackRest scheduling
  - Restic configuration
  - B2 account setup
  - Daily backup verification

**Days 5-7:**
- User training & documentation
  - Admin system walkthrough
  - Teachers absensi + grading tutorial
  - Parents app usage guide
  - Technical documentation (API docs, setup guide)
- Data preparation
  - Create demo/test data
  - Import existing students (if any)
  - Setup payment test accounts
- Go-live checklist
  - All systems verified
  - Backup tested
  - Disaster recovery plan documented
  - Support contacts set
  - Monitoring alerts configured
- Monitoring & alerting setup
  - Health checks
  - Error logging
  - Performance monitoring
  - Backup status monitoring

**DELIVERABLE:** Production system live, all users trained, monitoring active, go-live complete ✅

---

## ⚙️ PRE-DEVELOPMENT CHECKLIST

### Payment Gateway (DO IMMEDIATELY - 2-3 Days Approval)
```
BCA Setup:
☐ Call BCA corporate department
☐ Request API access (payment gateway)
☐ Submit company documents
☐ Get API key, secret, client ID
☐ Setup VA prefix
☐ Request webhook whitelist
☐ Test in BCA Sandbox

Mandiri Setup:
☐ Contact Mandiri corporate
☐ Request Virtual Account API
☐ Get credentials
☐ Sandbox testing
☐ Webhook configuration
```

### Infrastructure
```
Proxmox Servers:
☐ Server 1 (Primary): Backend ready, Docker installed
☐ Server 2 (Standby): Ready, network connectivity verified
☐ Both servers: SSH access, power backup configured
☐ Network: VPN/private connection between locations

Domain & SSL:
☐ Domain registered (alfakhirschool.id or similar)
☐ Cloudflare account created
☐ DNS records configured
☐ SSL certificate plan (Let's Encrypt)
```

### External Services
```
Firebase:
☐ Firebase project created
☐ Cloud Messaging enabled
☐ Service account JSON downloaded
☐ APK SHA fingerprints configured

Google Play:
☐ Developer account created ($25 one-time)
☐ 3 app listings created (siswa, orang tua, [guru if mobile])
☐ Keystore file generated for APK signing
☐ Icons & screenshots prepared

Backblaze B2:
☐ Account created
☐ Free tier activated
☐ API key generated

GitHub:
☐ Repository created (private)
☐ Branching strategy planned (main, develop)
☐ Collaborators added

Vercel:
☐ Account created
☐ GitHub connected
☐ Environment variables prepared
```

### Team & Resources
```
Backend Developer: 1 full-time
Frontend Developer (Next.js): 1 full-time
Mobile Developer (Flutter): 2-3 full-time
DevOps (Proxmox/Infrastructure): 1 full-time
QA Tester: 1 (from Week 2 onwards)
Project Manager: 1 (optional, recommended)
```

### Branding Assets
```
Logo Files:
☐ SMA logo (500x500px PNG)
☐ SMP logo (500x500px PNG)
☐ SD logo (500x500px PNG)
☐ Favicon (32x32px ICO)
☐ Logo SVG versions (all 3)
☐ White background variants
☐ Transparent background variants
```

---

## ✅ SUCCESS CRITERIA (MVP)

```
✓ Login working (all roles: admin, guru, siswa, ortu)
✓ QR attendance system functional (guru can scan, students record)
✓ Manual 6-digit code input working
✓ Nilai system working (input + auto-calculate + grades)
✓ Jurnal Guru system working (input + approval workflow)
✓ Digital signatures captured & displayed
✓ Payment system working (BCA/Mandiri VA generation + webhook)
✓ Rapor generated & downloadable
✓ All dashboards responsive & fast
✓ Mobile apps installable from Play Store (internal)
✓ Backup system running daily
✓ Disaster recovery tested
✓ All critical data logged (audit trail)
✓ System handles 1500+ concurrent users
✓ API response time < 500ms
✓ Page load time < 2s
✓ User training completed
✓ Documentation complete
✓ Go-live checklist all checked ✅
```

---

## 📊 FINAL SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Project** | Al Fakhir School LMS |
| **Users** | 1500+ (SD/SMP/SMA) |
| **Platforms** | 2 Mobile Apps + 2 Web Dashboards |
| **Applications** | Siswa App, Orang Tua App, Guru Dashboard, Admin Dashboard |
| **Backend** | Express.js + PostgreSQL on Proxmox |
| **Hosting** | Vercel (frontend), Proxmox (backend), B2 (backups) |
| **Payment** | BCA + Mandiri + N8N automation |
| **Timeline** | 4 weeks to MVP |
| **Go-Live** | 1 month from project start |
| **Branding** | 3 jenjang color variants + consistent design |
| **Database** | 13 tables with audit trail |
| **API** | 55+ endpoints |
| **Disaster Recovery** | 2-location with streaming replication |
| **Backup** | Free (pgBackRest + Restic + B2) |
| **Cost** | Minimal (~$0.30/month for backups) |

---

## 🚀 READY FOR DEVELOPMENT!

**This prompt contains everything needed to build the complete system.**

**Use this for Claude Code development, team briefing, or project reference.**

**Next action: Copy this prompt to Claude Code and start Week 1 development!**

---

**Questions before start?**
- Requirements clear?
- Timeline acceptable?
- Tech stack confirmed?

**Let's ship this in 4 weeks! 💪**

