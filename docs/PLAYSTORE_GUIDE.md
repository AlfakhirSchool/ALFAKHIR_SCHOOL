# Al Fakhir School LMS — Play Store Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**Apps:** Siswa App (`siswa_app/`), Orang Tua App (`orang_tua_app/`)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Generating Keystore](#2-generating-keystore)
3. [Building Release AAB](#3-building-release-aab)
4. [Firebase Setup for FCM](#4-firebase-setup-for-fcm)
5. [Google Play Console Setup](#5-google-play-console-setup)
6. [App Update Procedure](#6-app-update-procedure)
7. [Sample Store Listing (Bahasa Indonesia)](#7-sample-store-listing-bahasa-indonesia)

---

## 1. Prerequisites

### Software yang Dibutuhkan

| Software | Versi Minimum | Cara Install |
|----------|--------------|--------------|
| Flutter SDK | 3.19.0+ | https://flutter.dev/docs/get-started/install |
| Dart SDK | 3.3.0+ | Sudah termasuk dalam Flutter |
| Java JDK | 17+ | `sudo apt install openjdk-17-jdk` |
| Android SDK | API Level 34 | Via Android Studio atau `sdkmanager` |
| `keytool` | JDK 17+ | Sudah termasuk dalam JDK |

### Verifikasi Instalasi

```bash
# Cek Flutter
flutter --version
# Expected: Flutter 3.x.x • channel stable

# Cek Java
java -version
# Expected: openjdk version "17.0.x"

# Cek keytool
keytool -help 2>&1 | head -3

# Cek Android SDK
flutter doctor
# Semua item harus hijau untuk Android build
```

### Akun yang Diperlukan

- **Google Play Console** account: https://play.google.com/console
  - Biaya registrasi: USD 25 (sekali bayar)
- **Google Firebase** account: https://console.firebase.google.com
  - Gratis untuk basic usage

---

## 2. Generating Keystore

**PENTING:** Keystore adalah kunci kriptografi untuk menandatangani APK/AAB. Jika keystore hilang, Anda **tidak bisa** meng-update aplikasi di Play Store. Backup dengan sangat aman!

### 2.1 Generate Keystore Siswa App

```bash
bash ~/alfakhir/scripts/create-keystore.sh siswa
```

Script ini akan:
1. Generate file keystore di `~/.alfakhir-keystores/alfakhir-siswa-release.jks`
2. Menggunakan RSA 2048-bit, validity 10000 hari
3. DN: `CN=Al Fakhir Siswa App, OU=Mobile, O=Al Fakhir School, L=Jakarta, ST=DKI Jakarta, C=ID`

**Anda akan diminta memasukkan password keystore. Ingat password ini!**

### 2.2 Generate Keystore Orang Tua App

```bash
bash ~/alfakhir/scripts/create-keystore.sh ortu
```

File: `~/.alfakhir-keystores/alfakhir-ortu-release.jks`

### 2.3 Konfigurasi key.properties

Setelah keystore dibuat, buat file `key.properties` di direktori android app:

**Untuk siswa_app:**
```bash
cat > ~/alfakhir/siswa_app/android/key.properties <<EOF
storePassword=<PASSWORD_KEYSTORE_ANDA>
keyPassword=<PASSWORD_KEY_ANDA>
keyAlias=alfakhir-siswa
storeFile=${HOME}/.alfakhir-keystores/alfakhir-siswa-release.jks
EOF
```

**Untuk orang_tua_app:**
```bash
cat > ~/alfakhir/orang_tua_app/android/key.properties <<EOF
storePassword=<PASSWORD_KEYSTORE_ANDA>
keyPassword=<PASSWORD_KEY_ANDA>
keyAlias=alfakhir-ortu
storeFile=${HOME}/.alfakhir-keystores/alfakhir-ortu-release.jks
EOF
```

### 2.4 Konfigurasi build.gradle

Pastikan `android/app/build.gradle` sudah dikonfigurasi untuk menggunakan key.properties:

```groovy
// android/app/build.gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2.5 Backup Keystore

```bash
# Backup ke lokasi aman (USB drive, Google Drive, etc.)
cp ~/.alfakhir-keystores/alfakhir-siswa-release.jks /path/to/backup/
cp ~/.alfakhir-keystores/alfakhir-ortu-release.jks /path/to/backup/

# Backup juga key.properties (jangan simpan di git!)
cp ~/alfakhir/siswa_app/android/key.properties /path/to/backup/
cp ~/alfakhir/orang_tua_app/android/key.properties /path/to/backup/
```

---

## 3. Building Release AAB

### 3.1 Build Siswa App

```bash
bash ~/alfakhir/scripts/build-apk.sh siswa aab
```

Script ini melakukan:
1. Masuk ke direktori `siswa_app/`
2. `flutter clean` (membersihkan build lama)
3. `flutter pub get` (install dependencies)
4. `flutter build appbundle --release` (build AAB)
5. Copy output ke `dist/alfakhir-siswa_TIMESTAMP.aab`

**Output:** `~/alfakhir/dist/alfakhir-siswa_YYYYMMDD_HHMMSS.aab`

### 3.2 Build Orang Tua App

```bash
bash ~/alfakhir/scripts/build-apk.sh ortu aab
```

**Output:** `~/alfakhir/dist/alfakhir-ortu_YYYYMMDD_HHMMSS.aab`

### 3.3 Build APK (untuk testing internal)

```bash
# APK untuk testing (split per ABI)
bash ~/alfakhir/scripts/build-apk.sh siswa apk
bash ~/alfakhir/scripts/build-apk.sh ortu apk
```

### 3.4 Build Manual (jika script tidak tersedia)

```bash
# Siswa App
cd ~/alfakhir/siswa_app
flutter clean
flutter pub get
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab

# Orang Tua App
cd ~/alfakhir/orang_tua_app
flutter clean
flutter pub get
flutter build appbundle --release
```

### 3.5 Verifikasi AAB

```bash
# Cek ukuran AAB (target < 100 MB)
ls -lh ~/alfakhir/dist/*.aab

# Analyze APK/AAB size
cd ~/alfakhir/siswa_app
flutter build apk --analyze-size
```

---

## 4. Firebase Setup for FCM

### 4.1 Buat Project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Klik **Add project**
3. Nama project: `Al Fakhir School LMS`
4. Google Analytics: Enable (recommended)
5. Klik **Create project**

### 4.2 Tambah Android App ke Firebase

#### Untuk Siswa App

1. Di Firebase Console → Project → klik ikon Android
2. Isi:
   - Android package name: `id.alfakhirschool.siswa` (sesuai `pubspec.yaml`)
   - App nickname: `Al Fakhir Siswa`
   - Debug signing certificate SHA-1: (opsional, untuk debug)
3. Klik **Register app**
4. **Download `google-services.json`**
5. Simpan ke: `~/alfakhir/siswa_app/android/app/google-services.json`

```bash
# Verify file ada
ls -la ~/alfakhir/siswa_app/android/app/google-services.json
```

#### Untuk Orang Tua App

1. Tambah app Android baru di project yang sama
2. Package name: `id.alfakhirschool.orangtua`
3. App nickname: `Al Fakhir Orang Tua`
4. **Download `google-services.json`**
5. Simpan ke: `~/alfakhir/orang_tua_app/android/app/google-services.json`

### 4.3 Konfigurasi build.gradle untuk Firebase

**android/build.gradle (project level):**
```groovy
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**android/app/build.gradle (app level):**
```groovy
apply plugin: 'com.google.gms.google-services'
```

### 4.4 Dapatkan FCM Server Key

1. Firebase Console → Project Settings (ikon gear)
2. Tab **Cloud Messaging**
3. Di section **Cloud Messaging API (Legacy)**: copy **Server key**

> **Catatan:** Jika section Legacy tidak muncul, enable dulu: Enable Cloud Messaging API → Legacy API.

5. Update backend `.env`:

```bash
# Di server
nano ~/alfakhir/.env

# Ubah baris:
FCM_SERVER_KEY=AAAAxxxxxxx:APA91bxxx...

# Restart backend
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### 4.5 Konfigurasi Flutter FCM

Di `pubspec.yaml` setiap app, pastikan ada:

```yaml
dependencies:
  firebase_core: ^latest
  firebase_messaging: ^latest
```

```bash
cd ~/alfakhir/siswa_app
flutter pub get
```

---

## 5. Google Play Console Setup

### 5.1 Buat Aplikasi Baru

1. Login ke [Google Play Console](https://play.google.com/console)
2. Klik **Create app**
3. Isi:

| Field | Siswa App | Orang Tua App |
|-------|-----------|---------------|
| App name | Al Fakhir Siswa | Al Fakhir Orang Tua |
| Default language | Indonesia (id) | Indonesia (id) |
| App or game | App | App |
| Free or paid | Free | Free |

4. Centang: "I agree to the Play Developer Distribution Agreement"
5. Klik **Create app**

### 5.2 Store Listing

Navigasi ke **Grow** → **Store presence** → **Main store listing**:

#### Isi untuk Siswa App

**App name:** Al Fakhir Siswa

**Short description (80 chars):**
> Aplikasi siswa Al Fakhir School - cek jadwal, absensi & nilai

**Full description:** (lihat [Section 7](#7-sample-store-listing-bahasa-indonesia))

**App category:** Education

#### Screenshots

Upload minimal 2 screenshot untuk setiap device type:
- Phone (minimum 2)
- 7-inch tablet (opsional)
- 10-inch tablet (opsional)

Ukuran screenshot: minimum 320px, maksimum 3840px, aspect ratio antara 2:1 dan 1:2.

#### App Icon

- Format: PNG
- Ukuran: 512 x 512 px
- Tidak boleh ada alpha/transparency
- Tidak boleh ada rounded corners (Google Play akan menambahkan)

#### Feature Graphic

- Format: PNG atau JPEG
- Ukuran: 1024 x 500 px

### 5.3 Content Rating

1. **Policy** → **App content** → **Content ratings**
2. Klik **Start questionnaire**
3. Pilih kategori: **Education**
4. Jawab pertanyaan:
   - Violence: No
   - Sexual content: No
   - Language: No
   - Substances: No
   - Social features: Limited (in-app notifications)
5. Klik **Submit**

Rating yang diharapkan: **PEGI 3 / G (Everyone)**

### 5.4 Privacy Policy

Wajib ada URL privacy policy. Buat halaman sederhana di website sekolah atau gunakan generator:

URL contoh: `https://alfakhirschool.id/privacy-policy`

1. **Policy** → **App content** → **Privacy policy**
2. Masukkan URL privacy policy
3. Klik **Save**

Isi minimal privacy policy:
- Data apa yang dikumpulkan (nama, email, nilai)
- Bagaimana data digunakan
- Data tidak dijual ke pihak ketiga
- Kontak untuk pertanyaan privacy

### 5.5 Target Audience

1. **Policy** → **App content** → **Target audience and content**
2. Isi usia target: **13+** (siswa SMP/SMA)
3. Atau **All ages** jika ada siswa SD

### 5.6 Upload AAB ke Internal Testing

1. **Release** → **Testing** → **Internal testing**
2. Klik **Create new release**
3. **App bundles and APKs** → Upload AAB file
4. Release name: `1.0.0`
5. Release notes: "Versi pertama aplikasi Al Fakhir School"
6. Klik **Save** → **Review release** → **Start rollout**

### 5.7 Proses Review dan Release

```
Internal Testing → Closed Testing → Open Testing → Production
    (Test tim)       (Terbatas)      (Beta publik)  (Live)
```

**Langkah ke Closed Testing:**
1. Internal Testing → pilih testers (email developer)
2. Setelah internal testing OK → **Promote to closed testing**

**Langkah ke Production:**
1. Closed/Open Testing → review feedback
2. **Releases** → **Production** → **Create new release**
3. **Rollout percentage:** mulai 10%, lalu 100%
4. Google review: 1-7 hari kerja

---

## 6. App Update Procedure

### 6.1 Bump Version Number

Di `pubspec.yaml`:

```yaml
version: 1.1.0+2  # format: semver+buildNumber
```

- `1.1.0` = version name (tampil di toko)
- `+2` = version code (harus selalu naik)

### 6.2 Update Changelog

Buat file `fastlane/metadata/android/id/changelogs/2.txt`:
```
Perbaikan bug dan peningkatan performa.
Tambahan fitur notifikasi pembayaran.
```

### 6.3 Build Ulang

```bash
# Bersihkan dan build ulang
cd ~/alfakhir/siswa_app
flutter clean
flutter pub get
flutter build appbundle --release

# Salin ke dist
cp build/app/outputs/bundle/release/app-release.aab \
   ~/alfakhir/dist/alfakhir-siswa-v1.1.0.aab
```

### 6.4 Upload ke Play Console

1. **Release** → **Production** → **Create new release**
2. Upload AAB baru
3. Isi release notes (Bahasa Indonesia)
4. Submit untuk review

### 6.5 Staged Rollout

Untuk meminimalkan risiko, gunakan staged rollout:
1. Mulai dengan 10%
2. Monitor crash rate di Play Console → Android Vitals
3. Jika OK setelah 24 jam: naikkan ke 50%, kemudian 100%

---

## 7. Sample Store Listing (Bahasa Indonesia)

### Siswa App — Al Fakhir Siswa

**Nama Aplikasi:** Al Fakhir Siswa

**Deskripsi Singkat (80 karakter):**
> Aplikasi resmi siswa Al Fakhir School – jadwal, nilai & notifikasi SPP

**Deskripsi Lengkap:**

```
Al Fakhir Siswa adalah aplikasi mobile resmi untuk siswa sekolah Al Fakhir School, 
dirancang untuk memudahkan proses belajar dan monitoring akademik secara digital.

🎓 FITUR UTAMA:

📅 Jadwal Pelajaran
Lihat jadwal pelajaran harian dan mingguan secara real-time. Tidak perlu lagi 
melihat papan pengumuman — semua ada di genggaman Anda!

✅ Absensi Digital
Ikuti absensi kelas dengan scan QR Code yang diberikan guru. Lihat rekap 
kehadiran Anda kapan saja.

📊 Nilai & Rapor
Pantau nilai mata pelajaran, UTS, UAS, dan rapor semester. Selalu tahu 
perkembangan akademik Anda.

💰 Informasi Tagihan
Terima notifikasi tagihan SPP dan pembayaran sekolah. Tidak ada lagi tagihan 
yang terlewat!

🔔 Notifikasi Pintar
Dapatkan pemberitahuan langsung untuk tagihan baru, konfirmasi pembayaran, 
jadwal berubah, dan pengumuman penting dari sekolah.

📱 Mudah Digunakan
Antarmuka yang bersih dan mudah dipahami. Dirancang khusus untuk siswa 
Indonesia.

Untuk pertanyaan dan bantuan, hubungi: admin@alfakhirschool.id

Al Fakhir School — Membentuk Generasi Berakhlak dan Berprestasi
```

---

### Orang Tua App — Al Fakhir Orang Tua

**Nama Aplikasi:** Al Fakhir Orang Tua

**Deskripsi Singkat:**
> Pantau perkembangan putra-putri Anda di Al Fakhir School dari mana saja

**Deskripsi Lengkap:**

```
Al Fakhir Orang Tua memungkinkan ayah dan bunda memantau perkembangan 
akademik putra-putri secara langsung dari smartphone.

👨‍👩‍👧 FITUR UNTUK ORANG TUA:

📊 Pantau Nilai Anak
Lihat nilai ulangan harian, UTS, UAS, dan rapor semester. Selalu update 
dengan prestasi akademik putra-putri Anda.

✅ Monitor Kehadiran
Cek rekap absensi anak setiap hari. Ketahui apakah anak hadir tepat waktu 
atau ada keterlambatan.

💳 Kelola Pembayaran SPP
Terima notifikasi tagihan SPP, uang kegiatan, dan pembayaran lainnya. 
Konfirmasi pembayaran lebih mudah dan cepat.

🔔 Notifikasi Real-Time
- Tagihan baru: notifikasi langsung ke HP Anda
- Pembayaran dikonfirmasi: tanda terima digital
- Tagihan jatuh tempo: reminder agar tidak terlambat

📅 Jadwal Anak
Lihat jadwal pelajaran dan kegiatan sekolah anak Anda.

📱 Aman dan Terpercaya
Data anak Anda dilindungi dengan enkripsi dan hanya bisa diakses oleh 
orang tua terdaftar.

Dukung prestasi anak Anda bersama Al Fakhir School!

Hubungi kami: admin@alfakhirschool.id
Website: www.alfakhirschool.id

Al Fakhir School — Membentuk Generasi Berakhlak dan Berprestasi
```

### Keywords (untuk App Store Optimization)

```
siswa, sekolah, rapor, nilai, absensi, spp, pembayaran, jadwal pelajaran, 
aplikasi sekolah, lms, learning management, al fakhir, pendidikan indonesia
```
