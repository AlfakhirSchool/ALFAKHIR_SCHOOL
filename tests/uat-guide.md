# User Acceptance Testing (UAT) Guide
## Al Fakhir School LMS

**Project:** Al Fakhir School Learning Management System  
**Version:** 1.0  
**Environment:** Staging / Production  
**API Base:** https://api.alfakhirschool.id/api  
**Admin URL:** https://admin.alfakhirschool.id  
**Guru URL:** https://guru.alfakhirschool.id  

---

## Pre-Conditions

Before starting UAT, verify the following:

- [ ] Backend API is reachable: `curl https://api.alfakhirschool.id/api/health`
- [ ] Database has been seeded with demo data (`npm run db:seed` in backend/)
- [ ] All Docker containers are running: `docker compose ps`
- [ ] web-admin and web-guru are deployed and accessible
- [ ] FCM (Firebase Cloud Messaging) is configured for push notifications
- [ ] MinIO / file storage is running

### Test Accounts

| Role        | Email / Username           | Password    |
|-------------|----------------------------|-------------|
| Admin       | admin@alfakhirschool.sch.id    | Admin@1234  |
| Guru        | guru@alfakhirschool.sch.id     | Guru@1234   |
| Siswa       | siswa@alfakhirschool.sch.id    | Siswa@1234  |
| Orang Tua   | ortu@alfakhirschool.sch.id     | Ortu@1234   |

> **Note:** Change passwords after UAT. Do not use production credentials for testing.

---

## Scenario Format

Each scenario follows this structure:

```
Given [precondition]
When  [action performed]
Then  [expected result]
```

Pass criteria: `[ ] Pass` / `[ ] Fail`  
If fail: record the actual result and screenshot.

---

## Role 1: Admin

### Scenario A-01 — Login

**Given** the Admin is on the login page at https://admin.alfakhirschool.id  
**When** they enter `admin@alfakhirschool.sch.id` / `Admin@1234` and click Login  
**Then** they are redirected to the Admin Dashboard showing statistics

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Redirect to dashboard | Dashboard loads within 3s | | `[ ] Pass` `[ ] Fail` |
| No error messages shown | Clean dashboard view | | `[ ] Pass` `[ ] Fail` |
| Stat cards visible | Jumlah Siswa, Guru, Kelas shown | | `[ ] Pass` `[ ] Fail` |

---

### Scenario A-02 — Tambah Siswa Baru

**Given** Admin is logged in  
**When** they navigate to Manajemen Siswa → Tambah Siswa, fill in all required fields, and click Simpan  
**Then** the new student appears in the student list with correct data

Test data:
```
NIS           : 2024001
Nama Lengkap  : Ahmad Budi Santoso
Jenis Kelamin : Laki-laki
Tanggal Lahir : 10/05/2010
Alamat        : Jl. Merdeka No. 5, Jakarta
Nama Orang Tua: Budi Santoso
No. Telepon   : 081234567890
Kelas         : 7A
```

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Form validation passes | No red error fields | | `[ ] Pass` `[ ] Fail` |
| Record saved | Success toast appears | | `[ ] Pass` `[ ] Fail` |
| Siswa in list | Row appears in table | | `[ ] Pass` `[ ] Fail` |
| Data correct | All fields match input | | `[ ] Pass` `[ ] Fail` |

---

### Scenario A-03 — Tambah Kelas

**Given** Admin is logged in  
**When** they navigate to Manajemen Kelas → Tambah Kelas with data: Nama Kelas `8B`, Wali Kelas `Ibu Sari`, Tahun Ajaran `2024/2025`  
**Then** the class appears in the class list

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Kelas created | Success notification | | `[ ] Pass` `[ ] Fail` |
| Appears in list | Row visible in table | | `[ ] Pass` `[ ] Fail` |
| Assign students | Can add siswa to kelas | | `[ ] Pass` `[ ] Fail` |

---

### Scenario A-04 — Generate Rapor

**Given** Admin is logged in and nilai/absensi data exists for a student  
**When** they navigate to Rapor → select semester, select kelas, click Generate  
**Then** a PDF rapor is generated and available for download

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| PDF generated | Download button appears | | `[ ] Pass` `[ ] Fail` |
| PDF opens | Valid PDF, not corrupted | | `[ ] Pass` `[ ] Fail` |
| Data correct | Student name, nilai, absensi match database | | `[ ] Pass` `[ ] Fail` |
| All students | Can bulk-generate for entire kelas | | `[ ] Pass` `[ ] Fail` |

---

### Scenario A-05 — Lihat Audit Log

**Given** Admin is logged in  
**When** they navigate to Pengaturan → Audit Log  
**Then** a table of recent system actions is displayed

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Log entries visible | Table with action, user, timestamp | | `[ ] Pass` `[ ] Fail` |
| Filter by date works | Results filtered correctly | | `[ ] Pass` `[ ] Fail` |
| Filter by user works | Only that user's actions shown | | `[ ] Pass` `[ ] Fail` |
| Accessible admin-only | Guru token gets 403 | | `[ ] Pass` `[ ] Fail` |

---

### Scenario A-06 — Manajemen Pembayaran

**Given** Admin is logged in  
**When** they navigate to Keuangan → Pembayaran, mark a student's SPP as Lunas  
**Then** payment status updates and a receipt can be printed

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Payment list loads | Table of students with status | | `[ ] Pass` `[ ] Fail` |
| Mark as Lunas | Status changes to Lunas | | `[ ] Pass` `[ ] Fail` |
| Receipt generated | PDF receipt downloadable | | `[ ] Pass` `[ ] Fail` |
| History recorded | Payment history entry created | | `[ ] Pass` `[ ] Fail` |

---

## Role 2: Guru

### Scenario G-01 — Login

**Given** Guru is on the login page at https://guru.alfakhirschool.id  
**When** they enter guru credentials and click Login  
**Then** they are taken to the Guru Dashboard

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Login succeeds | Dashboard visible | | `[ ] Pass` `[ ] Fail` |
| Correct role | Only sees Guru menu items | | `[ ] Pass` `[ ] Fail` |
| No admin access | Cannot reach /admin routes | | `[ ] Pass` `[ ] Fail` |

---

### Scenario G-02 — Input Absensi

**Given** Guru is logged in and has a class today  
**When** they navigate to Absensi → select class/date → mark students present/absent → Simpan  
**Then** attendance is recorded for all students

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Class list loads | Correct kelas shown | | `[ ] Pass` `[ ] Fail` |
| Student list loads | All siswa in class shown | | `[ ] Pass` `[ ] Fail` |
| Mark Hadir/Sakit/Izin/Alpa | Radio buttons work | | `[ ] Pass` `[ ] Fail` |
| Save succeeds | Confirmation message | | `[ ] Pass` `[ ] Fail` |
| QR mode works | QR code generated for scan | | `[ ] Pass` `[ ] Fail` |

---

### Scenario G-03 — Input Nilai

**Given** Guru is logged in  
**When** they navigate to Penilaian → select mata pelajaran/kelas → enter grades → Simpan  
**Then** grades are saved for all students

Test data: Input nilai UTS for 5 students (range 60–95)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Form shows students | All students in class listed | | `[ ] Pass` `[ ] Fail` |
| Validation on range | Error if nilai > 100 | | `[ ] Pass` `[ ] Fail` |
| Save all at once | Batch save works | | `[ ] Pass` `[ ] Fail` |
| Edit existing nilai | Can update previously entered grade | | `[ ] Pass` `[ ] Fail` |

---

### Scenario G-04 — Buat Jurnal Mengajar

**Given** Guru is logged in  
**When** they navigate to Jurnal Mengajar → Buat Jurnal → fill in topic, description, date → Submit  
**Then** the journal entry is created and visible

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Form fields available | Tanggal, Topik, Deskripsi, Kelas | | `[ ] Pass` `[ ] Fail` |
| Draft saved | Can save as draft | | `[ ] Pass` `[ ] Fail` |
| Submit for review | Status changes to Submitted | | `[ ] Pass` `[ ] Fail` |
| Admin can review | Admin sees submitted journal | | `[ ] Pass` `[ ] Fail` |

---

### Scenario G-05 — Lihat Daftar Kelas

**Given** Guru is logged in  
**When** they navigate to Kelas  
**Then** they see only the classes they are assigned to

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Only own classes | No classes from other teachers | | `[ ] Pass` `[ ] Fail` |
| Student list per class | Click kelas → shows students | | `[ ] Pass` `[ ] Fail` |

---

## Role 3: Siswa (Mobile App)

### Scenario S-01 — Login Mobile App

**Given** Siswa has the app installed  
**When** they enter their NIS and password  
**Then** they are taken to the siswa home screen

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Login works | Home screen loads | | `[ ] Pass` `[ ] Fail` |
| Correct name shown | "Selamat datang, [Nama]" | | `[ ] Pass` `[ ] Fail` |
| No admin/guru menu | Only siswa features visible | | `[ ] Pass` `[ ] Fail` |

---

### Scenario S-02 — Lihat Nilai

**Given** Siswa is logged in and grades have been entered  
**When** they navigate to Nilai  
**Then** they see their grades per subject

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Grades load | Table of mata pelajaran + nilai | | `[ ] Pass` `[ ] Fail` |
| Correct values | Match what guru entered | | `[ ] Pass` `[ ] Fail` |
| Filter by semester | Can switch semesters | | `[ ] Pass` `[ ] Fail` |

---

### Scenario S-03 — Lihat Jadwal

**Given** Siswa is logged in  
**When** they navigate to Jadwal  
**Then** they see their weekly class schedule

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Schedule loads | Days/times/subjects shown | | `[ ] Pass` `[ ] Fail` |
| Current day highlighted | Today's classes emphasized | | `[ ] Pass` `[ ] Fail` |

---

### Scenario S-04 — Lihat Pembayaran

**Given** Siswa is logged in  
**When** they navigate to Pembayaran  
**Then** they see their SPP payment status

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Payment history | Monthly SPP list visible | | `[ ] Pass` `[ ] Fail` |
| Status colors | Lunas = green, Belum = red | | `[ ] Pass` `[ ] Fail` |

---

### Scenario S-05 — Lihat Notifikasi

**Given** Siswa is logged in  
**When** they open the Notifikasi screen  
**Then** they see their notification feed

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Notifications load | Feed of items displayed | | `[ ] Pass` `[ ] Fail` |
| Mark as read | Tap marks item as read | | `[ ] Pass` `[ ] Fail` |
| Badge updates | Unread count updates | | `[ ] Pass` `[ ] Fail` |

---

## Role 4: Orang Tua (Mobile App)

### Scenario OT-01 — Login Mobile App

**Given** Orang Tua has the app installed  
**When** they log in with their credentials  
**Then** they see their child's information

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Login succeeds | Parent home screen loads | | `[ ] Pass` `[ ] Fail` |
| Child name shown | Correct child's name displayed | | `[ ] Pass` `[ ] Fail` |
| Multiple children | Can switch between children | | `[ ] Pass` `[ ] Fail` |

---

### Scenario OT-02 — Lihat Nilai Anak

**Given** Orang Tua is logged in  
**When** they navigate to Nilai  
**Then** they see their child's grades (read-only)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Grades displayed | Correct values shown | | `[ ] Pass` `[ ] Fail` |
| Cannot edit | No edit/delete controls | | `[ ] Pass` `[ ] Fail` |
| Cannot see others | Only own child's data | | `[ ] Pass` `[ ] Fail` |

---

### Scenario OT-03 — Lihat Pembayaran

**Given** Orang Tua is logged in  
**When** they navigate to Pembayaran  
**Then** they see SPP status and history

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Payment history visible | Monthly entries shown | | `[ ] Pass` `[ ] Fail` |
| Outstanding highlighted | Unpaid months shown clearly | | `[ ] Pass` `[ ] Fail` |

---

### Scenario OT-04 — Terima Notifikasi FCM

**Given** Orang Tua has notifications enabled in app settings  
**When** the Admin sends a broadcast notification  
**Then** Orang Tua receives a push notification

Trigger: Admin → Notifikasi → Kirim Broadcast → "Test UAT Notification"

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Push notification received | Banner appears on device | | `[ ] Pass` `[ ] Fail` |
| Notification content correct | Title/body matches broadcast | | `[ ] Pass` `[ ] Fail` |
| Tap opens app | App opens to correct screen | | `[ ] Pass` `[ ] Fail` |
| In-app notification listed | Appears in notification feed | | `[ ] Pass` `[ ] Fail` |

---

## Known Limitations & Workarounds

| # | Limitation | Workaround |
|---|-----------|------------|
| 1 | PDF rapor generation may take 5–10s for full class | Wait for progress bar; do not refresh |
| 2 | FCM push notifications require device to have internet | Test on physical device, not emulator |
| 3 | QR attendance scan requires camera permission | Grant camera permission when prompted |
| 4 | File uploads limited to 5MB per file | Compress images before upload |
| 5 | Rate limiter blocks >5 login attempts/min | Wait 1 minute before retrying |
| 6 | Locale Indonesian date format (DD/MM/YYYY) | Use the date picker, do not type manually |
| 7 | Audit logs only accessible by admin role | Log in as admin to view audit log |

---

## Sign-Off Table

| Role | Tester Name | Date | Signature | Status |
|------|-------------|------|-----------|--------|
| Admin | | | | `[ ] Approved` `[ ] Rejected` |
| Guru | | | | `[ ] Approved` `[ ] Rejected` |
| Siswa | | | | `[ ] Approved` `[ ] Rejected` |
| Orang Tua | | | | `[ ] Approved` `[ ] Rejected` |
| Tech Lead | | | | `[ ] Approved` `[ ] Rejected` |

**UAT Decision:**  
`[ ] PASS — Ready for production`  
`[ ] FAIL — Issues must be resolved before go-live`

**Notes / Issues to resolve before sign-off:**

```
1.
2.
3.
```

---

*Al Fakhir School LMS — UAT Guide v1.0*
