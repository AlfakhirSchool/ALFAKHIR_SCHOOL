# Al Fakhir School LMS — Vercel Setup Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**Apps:** web-admin (Admin Dashboard), web-guru (Guru Dashboard)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Import Projects from GitHub](#2-import-projects-from-github)
3. [Environment Variables Setup](#3-environment-variables-setup)
4. [Build Settings](#4-build-settings)
5. [Custom Domains Setup](#5-custom-domains-setup)
6. [Preview Deployments](#6-preview-deployments)
7. [Environment Management per Environment](#7-environment-management-per-environment)
8. [Troubleshooting Build Failures](#8-troubleshooting-build-failures)
9. [Performance Optimization](#9-performance-optimization)
10. [Monitoring on Vercel Dashboard](#10-monitoring-on-vercel-dashboard)

---

## 1. Prerequisites

Sebelum setup Vercel, pastikan:

- [ ] Akun Vercel sudah dibuat di [vercel.com](https://vercel.com)
- [ ] Repository `AlfakhirSchool/ALFAKHIR_SCHOOL` sudah ada di GitHub
- [ ] Akun GitHub dengan akses ke repository sudah terkoneksi ke Vercel
- [ ] Backend API sudah running di `https://api.alfakhirschool.id`
- [ ] SSL backend sudah valid
- [ ] CORS dikonfigurasi di backend untuk domain Vercel

---

## 2. Import Projects from GitHub

### 2.1 Import web-admin

1. Login ke [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik **Add New...** → **Project**
3. Pilih **Import Git Repository**
4. Cari dan pilih: `AlfakhirSchool/ALFAKHIR_SCHOOL`
5. Di halaman konfigurasi:

| Setting | Value |
|---------|-------|
| Project Name | `alfakhir-web-admin` |
| Framework Preset | Next.js |
| Root Directory | `web-admin` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

6. Klik **Deploy**

### 2.2 Import web-guru

Ulangi langkah yang sama untuk web-guru:

| Setting | Value |
|---------|-------|
| Project Name | `alfakhir-web-guru` |
| Framework Preset | Next.js |
| Root Directory | `web-guru` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 2.3 Konfigurasi Monorepo (Root Directory)

Karena kedua app ada dalam satu repository (monorepo), Vercel perlu dikonfigurasi dengan benar:

1. Di project settings → **General** → **Root Directory**
2. Set ke `web-admin` (untuk project admin) atau `web-guru` (untuk project guru)
3. Vercel akan hanya deploy files di direktori tersebut

---

## 3. Environment Variables Setup

### 3.1 Environment Variables untuk web-admin

Di Vercel Dashboard → project `alfakhir-web-admin` → **Settings** → **Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.alfakhirschool.id/api` | Production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Development (local) |
| `NEXT_PUBLIC_APP_NAME` | `Al Fakhir School - Admin` | All |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | All |

### 3.2 Environment Variables untuk web-guru

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.alfakhirschool.id/api` | Production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Development (local) |
| `NEXT_PUBLIC_APP_NAME` | `Al Fakhir School - Guru` | All |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | All |

### 3.3 Cara Menambah Environment Variable

1. Buka project di Vercel Dashboard
2. Klik **Settings** tab
3. Klik **Environment Variables** di sidebar
4. Klik **Add New**
5. Isi **Key** dan **Value**
6. Pilih environment: Production, Preview, Development
7. Klik **Save**
8. **Redeploy** proyek agar variabel baru berlaku

### 3.4 Environment Variables di vercel.json

Alternatifnya, variabel juga sudah dikonfigurasi di `vercel.json` masing-masing app:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.alfakhirschool.id/api"
  }
}
```

> **Catatan:** Variabel di Vercel Dashboard **override** variabel di `vercel.json`. Gunakan Dashboard untuk production secrets.

---

## 4. Build Settings

### 4.1 Next.js Configuration (vercel.json)

File `web-admin/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/dashboard",
      "permanent": false
    }
  ]
}
```

### 4.2 Region Deployment

Kedua app di-deploy ke region `sin1` (Singapore) untuk latency minimal dari Indonesia.

Untuk mengubah region:
1. Vercel Dashboard → Project → Settings → **Functions**
2. Atau update `"regions": ["sin1"]` di `vercel.json`

### 4.3 Node.js Version

Vercel menggunakan Node.js versi yang dikonfigurasi di `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 5. Custom Domains Setup

### 5.1 Add Custom Domain di Vercel

1. Vercel Dashboard → project `alfakhir-web-admin` → **Settings** → **Domains**
2. Klik **Add**
3. Masukkan: `admin.alfakhirschool.id`
4. Klik **Add**

Vercel akan memberikan instruksi DNS. Untuk Cloudflare/DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | admin | `cname.vercel-dns.com` |
| CNAME | guru | `cname.vercel-dns.com` |

Atau jika menggunakan Vercel nameserver:
| Type | Name | Value |
|------|------|-------|
| A | admin | `76.76.21.21` |
| A | guru | `76.76.21.21` |

### 5.2 Ulangi untuk web-guru

Domain: `guru.alfakhirschool.id` → project `alfakhir-web-guru`

### 5.3 SSL Otomatis

Vercel otomatis menerbitkan SSL certificate via Let's Encrypt untuk custom domain. Tidak perlu konfigurasi manual.

### 5.4 Verify Domain

```bash
# Cek DNS propagation
dig admin.alfakhirschool.id CNAME +short
# Expected: cname.vercel-dns.com.

# Test HTTPS
curl -svL https://admin.alfakhirschool.id/ 2>&1 | grep -E "SSL|HTTP"
```

---

## 6. Preview Deployments

Vercel otomatis membuat **preview deployment** untuk setiap pull request.

### URL Format Preview

```
https://alfakhir-web-admin-<hash>-alfakhirschool.vercel.app
```

### Konfigurasi Preview

Secara default, preview deployment menggunakan environment variables yang di-set untuk **Preview** environment.

Untuk preview yang menggunakan staging API (jika ada):
1. Vercel Dashboard → Settings → Environment Variables
2. Tambahkan variabel dengan environment = **Preview**:
   - `NEXT_PUBLIC_API_URL` = `https://api-staging.alfakhirschool.id/api`

### Disable Preview Deployments (Opsional)

Jika tidak ingin preview deployment aktif:
1. Settings → Git → **Ignored Build Step**
2. Atau: Settings → General → **Preview Deployments** → Disable

---

## 7. Environment Management per Environment

| Environment | Trigger | API URL |
|-------------|---------|---------|
| Production | Push ke `main` | `https://api.alfakhirschool.id/api` |
| Preview | Pull Request / Push ke branch lain | `https://api.alfakhirschool.id/api` (atau staging) |
| Development | Local `vercel dev` | `http://localhost:3001/api` |

### Cara Set Variabel per Environment

1. Vercel Dashboard → Settings → Environment Variables
2. Klik **Add**
3. Pilih checkbox environment yang sesuai:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (untuk `vercel dev`)

### Local Development (vercel dev)

Buat file `.env.local` di direktori app:

```bash
# web-admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Al Fakhir School - Admin (Dev)
```

Contoh sudah ada di `web-admin/.env.local.example`.

---

## 8. Troubleshooting Build Failures

### Error: `Module not found`

**Symptom:**
```
Error: Cannot find module '@/components/...'
```

**Fix:**
```bash
# Test build lokal dulu
cd web-admin
npm install
npm run build

# Jika berhasil lokal tapi gagal di Vercel:
# Cek apakah semua dependencies ada di package.json (bukan hanya devDependencies)
```

### Error: `NEXT_PUBLIC_API_URL is undefined`

**Symptom:** App build berhasil tapi API call gagal

**Fix:**
1. Pastikan variabel sudah di-set di Vercel Dashboard
2. Pastikan nama variabel persis `NEXT_PUBLIC_API_URL` (prefix `NEXT_PUBLIC_` wajib untuk client-side)
3. **Redeploy** setelah menambah variabel baru

### Error: Build timeout

**Symptom:**
```
Error: The build exceeded the timeout (default 45 minutes)
```

**Fix:**
```bash
# Optimasi build dengan caching
# Tambahkan ke next.config.js:
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}
```

### Error: TypeScript errors

**Symptom:**
```
Type error: Property 'x' does not exist on type 'y'
```

**Fix:**
```bash
# Jalankan TypeScript check lokal
cd web-admin
npx tsc --noEmit

# Fix semua TypeScript errors sebelum push
```

### Error: `npm install` fails

**Symptom:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Fix:**
```bash
# Gunakan legacy peer deps
# Tambahkan ke vercel.json:
{
  "installCommand": "npm install --legacy-peer-deps"
}
```

### Force Redeploy

Jika deployment stuck atau cache bermasalah:
1. Vercel Dashboard → Deployments
2. Klik titik tiga (...) di deployment terakhir
3. Klik **Redeploy**
4. Centang **Use existing Build Cache: NO**

---

## 9. Performance Optimization

### 9.1 ISR (Incremental Static Regeneration)

Untuk halaman yang datanya berubah jarang (misalnya daftar kelas), gunakan ISR:

```typescript
// pages/kelas/index.tsx
export async function getStaticProps() {
  const data = await fetchKelas();
  return {
    props: { data },
    revalidate: 60, // Regenerate setiap 60 detik
  };
}
```

### 9.2 Caching Headers

`vercel.json` sudah mengkonfigurasi security headers. Tambahkan cache headers untuk static assets:

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 9.3 Image Optimization

Gunakan `next/image` untuk optimasi gambar otomatis:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Al Fakhir School"
  width={120}
  height={40}
  priority  // Untuk gambar above-the-fold
/>
```

### 9.4 Bundle Analyzer

```bash
cd web-admin
npm install @next/bundle-analyzer --save-dev

# Analisis bundle size
ANALYZE=true npm run build
```

### 9.5 Edge Functions (untuk latency rendah)

Vercel Edge Functions berjalan di CDN edge nodes. Untuk middleware (auth check, redirects):

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 10. Monitoring on Vercel Dashboard

### 10.1 Deployment Status

Vercel Dashboard → Project → **Deployments**:
- Lihat semua deployment history
- Status: Ready (hijau), Building (kuning), Error (merah)
- Klik deployment untuk lihat build logs

### 10.2 Analytics

Aktifkan Vercel Analytics (gratis untuk Hobby plan):

1. Project Settings → **Analytics**
2. Enable analytics
3. Tambahkan ke `_app.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   
   export default function App({ Component, pageProps }) {
     return (
       <>
         <Component {...pageProps} />
         <Analytics />
       </>
     );
   }
   ```

### 10.3 Metrics yang Tersedia

| Metric | Location | Target |
|--------|----------|--------|
| Build duration | Deployments → Build Logs | < 3 menit |
| Function duration | Analytics → Functions | < 1 detik |
| Core Web Vitals (LCP) | Analytics | < 2.5 detik |
| Core Web Vitals (FID) | Analytics | < 100ms |
| Core Web Vitals (CLS) | Analytics | < 0.1 |

### 10.4 Real-time Logs

Untuk debug issues di production:
1. Vercel Dashboard → Project → **Logs**
2. Atau via Vercel CLI:
   ```bash
   npm install -g vercel
   vercel login
   vercel logs alfakhir-web-admin --follow
   ```

### 10.5 Alerts

Setup alerts Vercel untuk error rate tinggi:
1. Project Settings → **Notifications**
2. Enable: Deployment failure, Runtime errors
3. Set email/Slack notification
