# Al Fakhir School LMS — Installation Runbook

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**Target OS:** Ubuntu 24.04 LTS (Proxmox VM)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Proxmox VM Creation](#2-proxmox-vm-creation)
3. [One-Command Installation](#3-one-command-installation)
4. [Manual Step-by-Step Installation](#4-manual-step-by-step-installation)
5. [DNS Setup](#5-dns-setup)
6. [SSL Certificate Setup](#6-ssl-certificate-setup)
7. [Post-Install Verification Checklist](#7-post-install-verification-checklist)
8. [Common Installation Errors & Fixes](#8-common-installation-errors--fixes)
9. [Uninstall / Cleanup Procedure](#9-uninstall--cleanup-procedure)

---

## 1. Prerequisites

### Hardware Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| Network | 10 Mbps | 100 Mbps |

### Software Requirements

- Ubuntu 24.04 LTS (fresh install)
- Root or sudo access
- Internet connectivity
- Domain names pointed to the server IP (see DNS section)

### Required Open Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH management |
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS (API, N8N, MinIO) |

> **Catatan:** Port 3001 (backend), 5432 (postgres), 6379 (redis), 9000/9001 (minio), 5678 (n8n) hanya dibuka di interface loopback (`127.0.0.1`) — tidak perlu dibuka di firewall publik.

### Domain Requirements

Siapkan 3 subdomain yang sudah diarahkan ke IP server sebelum SSL setup:

```
api.alfakhirschool.id     → A → <SERVER_IP>
n8n.alfakhirschool.id     → A → <SERVER_IP>
minio.alfakhirschool.id   → A → <SERVER_IP>
```

---

## 2. Proxmox VM Creation

### 2.1 Download Ubuntu 24.04 ISO

Di Proxmox host, download ISO:

```bash
# Di Proxmox shell atau via GUI Storage → ISO Images → Download from URL
wget -O /var/lib/vz/template/iso/ubuntu-24.04-server.iso \
  https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso
```

### 2.2 Create VM via Proxmox GUI

1. Klik **Create VM** di Proxmox web interface
2. Isi konfigurasi berikut:

| Tab | Setting | Value |
|-----|---------|-------|
| General | VM ID | 200 (atau bebas) |
| General | Name | alfakhir-school-lms |
| OS | ISO Image | ubuntu-24.04-server.iso |
| OS | Type | Linux, Kernel 6.x |
| System | BIOS | SeaBIOS |
| System | Machine | q35 |
| Disks | Storage | local-lvm |
| Disks | Disk size | 60 GB |
| Disks | SSD emulation | checked |
| CPU | Sockets | 1 |
| CPU | Cores | 4 |
| Memory | Memory | 8192 MB |
| Network | Bridge | vmbr0 |
| Network | Model | VirtIO (paravirtualized) |

3. Klik **Finish** dan start VM
4. Buka console dan install Ubuntu dengan:
   - Language: English
   - Network: configure jika perlu static IP
   - Storage: Use entire disk
   - Profile: username `ubuntu`, server name `alfakhir-lms`
   - Install OpenSSH Server: **Yes**

### 2.3 Post-VM-Creation Steps

Setelah Ubuntu terinstall dan boot:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim htop ufw

# Set timezone
sudo timedatectl set-timezone Asia/Jakarta

# Verify
timedatectl
```

### 2.4 Proxmox VM via CLI (Alternatif)

```bash
# Di Proxmox host shell
qm create 200 \
  --name alfakhir-school-lms \
  --memory 8192 \
  --cores 4 \
  --sockets 1 \
  --net0 virtio,bridge=vmbr0 \
  --ide2 local:iso/ubuntu-24.04-server.iso,media=cdrom \
  --scsi0 local-lvm:60 \
  --scsihw virtio-scsi-pci \
  --boot order=ide2 \
  --ostype l26

qm start 200
```

---

## 3. One-Command Installation

Setelah Ubuntu siap dan DNS sudah propagate, jalankan installer otomatis:

```bash
# Download dan jalankan installer
curl -fsSL https://raw.githubusercontent.com/AlfakhirSchool/ALFAKHIR_SCHOOL/main/proxmox-install.sh \
  | sudo bash
```

Atau jika sudah clone repo:

```bash
sudo bash ~/alfakhir/proxmox-install.sh
```

### Yang Dilakukan Installer Secara Otomatis

Script `proxmox-install.sh` menjalankan 13 langkah:

| Step | Action |
|------|--------|
| 1 | Cek system requirements (RAM, disk) |
| 2 | Install dependencies (curl, git, openssl, certbot, dll) |
| 3 | Install Docker CE + Docker Compose |
| 4 | Clone repository ke `~/alfakhir` |
| 5 | Generate secrets & buat `.env` dengan password random |
| 6 | Buat direktori uploads, logs, backups |
| 7 | Konfigurasi UFW firewall (allow 22/80/443) |
| 8 | Pull Docker images & build backend |
| 9 | Start semua services (postgres, redis, minio, n8n, backend, nginx) |
| 10 | Seed demo data ke database |
| 11 | Setup cron jobs (backup, SSL renewal, health check) |
| 12 | Buat systemd service untuk auto-start saat reboot |
| 13 | Final status check |

### Catat Credentials yang Muncul

Installer akan menampilkan credentials sekali saja:

```
SIMPAN CREDENTIALS INI (hanya tampil sekali):
DB Password  : <generated>
Redis Pass   : <generated>
MinIO Pass   : <generated>
N8N Password : <generated>
```

Simpan di password manager. Credentials juga tersimpan di `~/alfakhir/.env`.

---

## 4. Manual Step-by-Step Installation

Gunakan panduan ini jika installer otomatis gagal.

### Step 1: Install Docker

```bash
# Remove old versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker
sudo systemctl enable --now docker

# Verify
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
export INSTALL_DIR="$HOME/alfakhir"

git clone --depth 1 --branch main \
  https://github.com/AlfakhirSchool/ALFAKHIR_SCHOOL.git \
  "$INSTALL_DIR"

cd "$INSTALL_DIR"
```

### Step 3: Create Environment File

```bash
cd ~/alfakhir

# Generate secure passwords
DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
REDIS_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
MINIO_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9@#%' | head -c 48)
JWT_REFRESH=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9@#%' | head -c 48)
N8N_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)

cat > .env <<EOF
POSTGRES_DB=alfakhir_school
POSTGRES_USER=alfakhir
POSTGRES_PASSWORD=${DB_PASS}
REDIS_PASSWORD=${REDIS_PASS}
MINIO_ROOT_USER=alfakhir
MINIO_ROOT_PASSWORD=${MINIO_PASS}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
N8N_USER=admin
N8N_PASSWORD=${N8N_PASS}
N8N_HOST=n8n.alfakhirschool.id
N8N_DB=n8n
FRONTEND_ADMIN_URL=https://admin.alfakhirschool.id
FRONTEND_GURU_URL=https://guru.alfakhirschool.id
FCM_SERVER_KEY=
EOF

chmod 600 .env
echo "Passwords generated. DB: $DB_PASS | Redis: $REDIS_PASS | MinIO: $MINIO_PASS | N8N: $N8N_PASS"
```

### Step 4: Create Directories

```bash
mkdir -p ~/alfakhir/{uploads,logs,backups/postgres,nginx/conf.d}
chmod -R 755 ~/alfakhir/uploads ~/alfakhir/logs
chmod 755 ~/alfakhir/scripts/*.sh
```

### Step 5: Configure Firewall

```bash
sudo ufw reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### Step 6: Build and Start Services

```bash
cd ~/alfakhir

# Pull base images
docker compose -f docker-compose.prod.yml pull postgres redis minio n8n nginx

# Build backend
docker compose -f docker-compose.prod.yml build --no-cache backend

# Start database first
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for postgres
echo "Waiting for PostgreSQL..."
until docker exec alfakhir_postgres pg_isready -U alfakhir -d alfakhir_school; do
  sleep 2
done

# Start remaining services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Step 7: Seed Demo Data

```bash
# Wait for backend
until curl -sf http://localhost:3001/api/health; do sleep 3; done

# Run seed
docker exec -i alfakhir_postgres psql -U alfakhir -d alfakhir_school \
  < ~/alfakhir/scripts/seed-demo.sql
```

### Step 8: Setup Systemd Auto-Start

```bash
sudo tee /etc/systemd/system/alfakhir-school.service <<SERVICE
[Unit]
Description=Al Fakhir School LMS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/alfakhir
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable alfakhir-school
```

### Step 9: Setup Cron Jobs

```bash
sudo tee /etc/cron.d/alfakhir-school <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Daily backup 02:00 WIB (19:00 UTC)
0 19 * * * root bash /root/alfakhir/scripts/backup.sh daily >> /root/alfakhir/logs/backup.log 2>&1

# SSL renewal check every Monday 03:00 WIB
0 20 * * 1 root bash /root/alfakhir/scripts/ssl-renew.sh >> /root/alfakhir/logs/ssl.log 2>&1

# Health check every 5 minutes
*/5 * * * * root bash /root/alfakhir/scripts/health-check.sh >> /root/alfakhir/logs/health.log 2>&1
CRON

sudo chmod 644 /etc/cron.d/alfakhir-school
```

---

## 5. DNS Setup

### Required DNS Records

Masuk ke panel DNS provider Anda (Cloudflare, Niagahoster, Dewaweb, dll) dan tambahkan:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | `<SERVER_IP>` | 300 |
| A | n8n | `<SERVER_IP>` | 300 |
| A | minio | `<SERVER_IP>` | 300 |

Ganti `<SERVER_IP>` dengan IP publik VM Anda.

### Verify DNS Propagation

```bash
# Cek dari server
dig api.alfakhirschool.id +short
dig n8n.alfakhirschool.id +short
dig minio.alfakhirschool.id +short

# Semua harus mengembalikan IP server Anda
# Propagation bisa memakan 5-60 menit
```

### Cloudflare Notes

Jika menggunakan Cloudflare:
- Set **Proxy status ke DNS only (grey cloud)** untuk domain backend saat setup SSL pertama kali
- Setelah SSL terpasang, bisa diaktifkan kembali ke orange cloud jika diinginkan
- Pastikan SSL/TLS mode di Cloudflare = **Full (strict)**

---

## 6. SSL Certificate Setup

SSL menggunakan Let's Encrypt via Certbot. Pastikan DNS sudah propagate sebelum langkah ini.

### 6.1 Install Certbot (jika belum)

```bash
sudo apt install -y certbot
```

### 6.2 Stop Nginx Temporarily (Jika Sudah Running)

```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml stop nginx
```

### 6.3 Obtain Certificates

```bash
# Dapatkan cert untuk semua domain sekaligus
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email admin@alfakhirschool.id \
  -d api.alfakhirschool.id \
  -d n8n.alfakhirschool.id \
  -d minio.alfakhirschool.id

# Verifikasi
ls /etc/letsencrypt/live/
```

### 6.4 Restart Nginx

```bash
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d nginx
```

### 6.5 Auto-Renewal

Script `ssl-renew.sh` sudah dikonfigurasi di cron (setiap Senin). Untuk test manual:

```bash
sudo bash ~/alfakhir/scripts/ssl-renew.sh
```

---

## 7. Post-Install Verification Checklist

Jalankan setelah instalasi selesai:

```bash
bash ~/alfakhir/scripts/health-check.sh
```

### Manual Verification

```bash
# 1. Cek semua container running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Cek API health
curl -sf https://api.alfakhirschool.id/api/health | jq .

# 3. Test login admin
curl -s -X POST https://api.alfakhirschool.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alfakhirschool.id","password":"Admin@1234"}' | jq .

# 4. Cek N8N accessible
curl -sf -o /dev/null -w "%{http_code}" https://n8n.alfakhirschool.id/

# 5. Cek MinIO accessible
curl -sf -o /dev/null -w "%{http_code}" https://minio.alfakhirschool.id/

# 6. Cek SSL valid
echo | openssl s_client -connect api.alfakhirschool.id:443 2>/dev/null | \
  openssl x509 -noout -dates

# 7. Cek backup directory
ls -lh ~/alfakhir/backups/postgres/

# 8. Cek firewall
sudo ufw status verbose
```

### Expected Results Checklist

- [ ] 6 container running: postgres, redis, minio, n8n, backend, nginx
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Login berhasil dan mengembalikan JWT token
- [ ] N8N web UI accessible (HTTP 200 atau 401)
- [ ] MinIO console accessible (HTTP 200)
- [ ] SSL cert valid dan tidak expired
- [ ] Backup file ada di `backups/postgres/`
- [ ] UFW: hanya port 22, 80, 443 yang terbuka

---

## 8. Common Installation Errors & Fixes

### Error: "Docker command not found"

**Symptom:** `bash: docker: command not found`

**Fix:**
```bash
# Re-install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl restart docker
```

### Error: "Permission denied on Docker socket"

**Symptom:** `Got permission denied while trying to connect to the Docker daemon`

**Fix:**
```bash
sudo usermod -aG docker $USER
newgrp docker
# atau logout dan login kembali
```

### Error: "Port 80/443 already in use"

**Symptom:** `Bind: address already in use`

**Diagnosis:**
```bash
sudo ss -tlnp | grep -E '80|443'
```

**Fix:**
```bash
# Hentikan service yang menggunakan port tersebut
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable apache2 nginx 2>/dev/null || true

# Restart alfakhir nginx
docker compose -f ~/alfakhir/docker-compose.prod.yml restart nginx
```

### Error: "PostgreSQL tidak mau healthy"

**Symptom:** `PostgreSQL tidak mau healthy dalam 60s`

**Diagnosis:**
```bash
docker logs alfakhir_postgres --tail 50
docker inspect alfakhir_postgres --format '{{.State.Health}}'
```

**Fix:**
```bash
# Cek disk space (postgres butuh ruang)
df -h /

# Cek volume
docker volume ls | grep postgres

# Force recreate
docker compose -f ~/alfakhir/docker-compose.prod.yml down
docker volume rm alfakhir_postgres_data  # HATI-HATI: hapus data!
docker compose -f ~/alfakhir/docker-compose.prod.yml up -d postgres
```

### Error: "Backend tidak bisa konek ke database"

**Symptom:** Backend crash dengan `ECONNREFUSED` ke postgres

**Diagnosis:**
```bash
docker logs alfakhir_backend --tail 30
docker exec alfakhir_backend ping postgres  # test network
```

**Fix:**
```bash
# Pastikan backend dan postgres di jaringan yang sama
docker network ls
docker network inspect alfakhir_net

# Restart backend setelah postgres healthy
docker compose -f ~/alfakhir/docker-compose.prod.yml restart backend
```

### Error: "SSL certificate failed"

**Symptom:** `certbot: error: No valid addresses found for domain`

**Cause:** DNS belum propagate atau port 80 tidak accessible dari internet.

**Fix:**
```bash
# Verifikasi DNS dari internet
dig @8.8.8.8 api.alfakhirschool.id +short

# Pastikan port 80 terbuka
sudo ufw allow 80/tcp
curl -v http://api.alfakhirschool.id/

# Coba lagi setelah DNS propagate (tunggu 5-60 menit)
```

### Error: "Git clone gagal — Repository not found"

**Fix:**
```bash
# Pastikan repository sudah public atau gunakan token
git clone https://<GITHUB_TOKEN>@github.com/AlfakhirSchool/ALFAKHIR_SCHOOL.git ~/alfakhir
```

### Error: "Disk penuh saat build"

**Symptom:** `No space left on device`

**Fix:**
```bash
# Cleanup Docker resources
docker system prune -af --volumes

# Check disk
df -h

# Hapus log lama
sudo find ~/alfakhir/logs -name "*.log" -mtime +7 -delete
```

---

## 9. Uninstall / Cleanup Procedure

> **PERINGATAN:** Prosedur ini akan menghapus semua data. Pastikan sudah backup sebelum melanjutkan.

### 9.1 Backup Sebelum Uninstall

```bash
# Backup database terakhir
bash ~/alfakhir/scripts/backup.sh full

# Salin backup ke tempat aman
cp ~/alfakhir/backups/postgres/*.sql.gz /tmp/
```

### 9.2 Stop dan Hapus Services

```bash
# Stop systemd service
sudo systemctl stop alfakhir-school
sudo systemctl disable alfakhir-school
sudo rm /etc/systemd/system/alfakhir-school.service
sudo systemctl daemon-reload

# Stop Docker containers
docker compose -f ~/alfakhir/docker-compose.prod.yml down --volumes --remove-orphans

# Hapus Docker images
docker images | grep alfakhir | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
```

### 9.3 Hapus Data dan Files

```bash
# Hapus cron jobs
sudo rm -f /etc/cron.d/alfakhir-school

# Hapus install directory
rm -rf ~/alfakhir

# Hapus SSL certificates (optional)
sudo certbot delete --cert-name api.alfakhirschool.id
sudo certbot delete --cert-name n8n.alfakhirschool.id
sudo certbot delete --cert-name minio.alfakhirschool.id

# Hapus log files
sudo rm -f /var/log/alfakhir-*.log
```

### 9.4 Cleanup Docker (Optional)

```bash
# Hapus semua Docker data yang tidak dipakai
docker system prune -af --volumes

# Uninstall Docker (jika tidak diperlukan lagi)
sudo apt remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo rm -rf /var/lib/docker
```
