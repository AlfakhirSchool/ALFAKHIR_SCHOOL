# Sistem Inti Al-Fakhir School

## Tentang Proyek

**Core platform** Al-Fakhir School (SD & SMP Islam Modern Al-Fakhir, Sawangan, Depok — Yayasan Prestasi Belia Indonesia). Sistem sudah berjalan — bukan proyek baru. Pusat data & operasional sekolah dengan **dashboard berbeda per role**.

## Role & Dashboard

- **Admin** — full access, manajemen user, PPDB/observasi, laporan global
- **Keuangan** — rekap pemasukan per kelas/unit, status lunas/belum bayar, laporan periode
- **Guru** — data siswa per kelas yang diampu, input nilai/catatan, rekap kehadiran
- **Pewawancara** — daftar calon siswa, input hasil wawancara & rekomendasi, status pendaftaran
- Role lain bertahap: Admin Yayasan, Kepala Sekolah, Staf TU, Wali Murid

Satu auth & RBAC layer — login sekali, menu disesuaikan role.

## Sistem Terkait (Terpisah, Integrasi via API)

- **Absensi** — NIS-based login, GPS logging, QR scanner, APK Android (CT 101)
- **Kuitansi** — web app pembayaran, QR per unit, print A5/A4 (CT 120, repo `AlfakhirSchool/kuatansi`)
- **LMS (`alfakhir-lms`)** — CT 101
- **Payment tracking** — Google Apps Script + Sheets multi-kelas

## Infrastruktur

- Proxmox, per-service dalam container terpisah
- Domain: Google Workspace for Education

## Aturan Kerja

- Cek dulu apakah fitur baru masuk dashboard yang ada atau butuh role/dashboard baru
- Kalau ragu soal role mana yang punya akses ke data tertentu — tanya, jangan asumsi
- Ikuti pola/konvensi yang sudah ada; jangan perkenalkan library atau pattern baru tanpa alasan kuat
