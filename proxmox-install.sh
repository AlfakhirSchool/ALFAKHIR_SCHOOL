#!/bin/bash
# =============================================================================
# Al Fakhir School LMS - Proxmox/Ubuntu Auto-Installer
# Usage: sudo bash /tmp/install.sh
# Tested on: Ubuntu 22.04 LTS
# =============================================================================

set -euo pipefail

# ─── Color helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${NC}"; }

# ─── Config ───────────────────────────────────────────────────────────────────
INSTALL_DIR="${HOME}/alfakhir"
REPO_URL="https://github.com/AlfakhirSchool/ALFAKHIR_SCHOOL.git"
BRANCH="main"
DOMAIN_API="api.alfakhirschool.id"
DOMAIN_N8N="n8n.alfakhirschool.id"
DOMAIN_MINIO="minio.alfakhirschool.id"

# ─── Root check ───────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Jalankan sebagai root: sudo bash $0"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     Al Fakhir School LMS - Auto Installer v1.0          ║${NC}"
echo -e "${BOLD}║     Target: ${INSTALL_DIR}                              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── System requirements ──────────────────────────────────────────────────────
step "STEP 1: System Requirements"

OS_ID=$(. /etc/os-release && echo "$ID")
OS_VER=$(. /etc/os-release && echo "$VERSION_ID")
info "OS: $OS_ID $OS_VER"

RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
DISK_GB=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')
CPU_COUNT=$(nproc)

info "CPU: $CPU_COUNT cores | RAM: ${RAM_GB}GB | Disk free: ${DISK_GB}GB"
[[ $RAM_GB -lt 2 ]]  && warn "RAM < 2GB — minimum 4GB recommended"
[[ $DISK_GB -lt 10 ]] && error "Disk free < 10GB. Butuh minimal 20GB."
success "System requirements OK"

# ─── Update & packages ────────────────────────────────────────────────────────
step "STEP 2: Install Dependencies"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    curl wget git openssl ca-certificates gnupg lsb-release \
    ufw fail2ban htop unzip bc jq certbot 2>/dev/null
success "Packages installed"

# ─── Docker ───────────────────────────────────────────────────────────────────
step "STEP 3: Install Docker"

if command -v docker &>/dev/null; then
    DOCKER_VER=$(docker --version | grep -oP '\d+\.\d+')
    success "Docker already installed: $DOCKER_VER"
else
    info "Installing Docker CE..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    success "Docker CE installed"
fi

# Docker Compose (plugin or standalone)
if docker compose version &>/dev/null 2>&1; then
    success "Docker Compose plugin: $(docker compose version --short)"
elif command -v docker-compose &>/dev/null; then
    success "Docker Compose standalone: $(docker-compose --version)"
else
    info "Installing Docker Compose standalone..."
    COMPOSE_VER="2.29.1"
    curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPOSE_VER}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    success "Docker Compose $COMPOSE_VER installed"
fi

# Helper: run compose regardless of which variant is installed
compose_cmd() {
    if docker compose version &>/dev/null 2>&1; then
        docker compose "$@"
    else
        docker-compose "$@"
    fi
}

# ─── Clone repo ───────────────────────────────────────────────────────────────
step "STEP 4: Clone Repository"

if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Repository exists — pulling latest..."
    git -C "$INSTALL_DIR" fetch origin
    git -C "$INSTALL_DIR" reset --hard origin/$BRANCH
    success "Repository updated"
else
    info "Cloning from $REPO_URL ..."
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    success "Repository cloned to $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ─── Generate secrets ─────────────────────────────────────────────────────────
step "STEP 5: Generate Secrets & .env"

gen_secret() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9@#%' | head -c 48; }
gen_pass()   { openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24; }

ENV_FILE="$INSTALL_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
    warn ".env sudah ada — melewati generate ulang (hapus manual jika ingin reset)"
else
    DB_PASS=$(gen_pass)
    REDIS_PASS=$(gen_pass)
    MINIO_PASS=$(gen_pass)
    JWT_SECRET=$(gen_secret)
    JWT_REFRESH=$(gen_secret)
    N8N_PASS=$(gen_pass)

    cat > "$ENV_FILE" <<EOF
# Al Fakhir School LMS - Production Environment
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# WARNING: Keep this file SECRET — never commit to git

# ── Database ────────────────────────────────────────────────
POSTGRES_DB=alfakhir_school
POSTGRES_USER=alfakhir
POSTGRES_PASSWORD=${DB_PASS}

# ── Redis ───────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASS}

# ── MinIO ───────────────────────────────────────────────────
MINIO_ROOT_USER=alfakhir
MINIO_ROOT_PASSWORD=${MINIO_PASS}

# ── JWT ─────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}

# ── N8N ─────────────────────────────────────────────────────
N8N_USER=admin
N8N_PASSWORD=${N8N_PASS}
N8N_HOST=${DOMAIN_N8N}
N8N_DB=n8n

# ── Frontend (set after Vercel deploy) ──────────────────────
FRONTEND_ADMIN_URL=https://admin.alfakhirschool.id
FRONTEND_GURU_URL=https://guru.alfakhirschool.id

# ── FCM (isi setelah setup Firebase Console) ─────────────────
FCM_SERVER_KEY=

# ── Domain ──────────────────────────────────────────────────
DOMAIN_API=${DOMAIN_API}
DOMAIN_N8N=${DOMAIN_N8N}
DOMAIN_MINIO=${DOMAIN_MINIO}
EOF

    chmod 600 "$ENV_FILE"
    success ".env created with secure random secrets"
    echo ""
    echo -e "  ${YELLOW}SIMPAN CREDENTIALS INI (hanya tampil sekali):${NC}"
    echo -e "  DB Password  : ${BOLD}${DB_PASS}${NC}"
    echo -e "  Redis Pass   : ${BOLD}${REDIS_PASS}${NC}"
    echo -e "  MinIO Pass   : ${BOLD}${MINIO_PASS}${NC}"
    echo -e "  N8N Password : ${BOLD}${N8N_PASS}${NC}"
    echo ""
fi

# ─── Directories & permissions ────────────────────────────────────────────────
step "STEP 6: Create Directories"

mkdir -p "$INSTALL_DIR"/{uploads,logs,backups/postgres,nginx/conf.d}
chmod -R 755 "$INSTALL_DIR"/uploads
chmod -R 755 "$INSTALL_DIR"/logs
chmod 755 "$INSTALL_DIR"/scripts/*.sh 2>/dev/null || true
success "Directories ready"

# ─── Firewall ─────────────────────────────────────────────────────────────────
step "STEP 7: Configure Firewall"

ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
success "UFW: SSH + HTTP + HTTPS allowed"

# ─── Pull images & build ──────────────────────────────────────────────────────
step "STEP 8: Pull Docker Images & Build"

cd "$INSTALL_DIR"
info "Pulling base images..."
compose_cmd -f docker-compose.prod.yml pull --quiet postgres redis minio n8n nginx 2>&1 | tail -5 || true

info "Building backend image..."
compose_cmd -f docker-compose.prod.yml build --no-cache backend 2>&1 | tail -20
success "Images ready"

# ─── Start services ───────────────────────────────────────────────────────────
step "STEP 9: Start Services"

compose_cmd -f docker-compose.prod.yml up -d postgres redis
info "Waiting for PostgreSQL to be healthy..."
TIMEOUT=60; ELAPSED=0
while ! docker exec alfakhir_postgres pg_isready -U alfakhir -d alfakhir_school -q 2>/dev/null; do
    sleep 3; ELAPSED=$((ELAPSED+3))
    [[ $ELAPSED -ge $TIMEOUT ]] && error "PostgreSQL tidak mau healthy dalam ${TIMEOUT}s"
    echo -n "."
done
echo ""
success "PostgreSQL healthy"

info "Starting remaining services..."
compose_cmd -f docker-compose.prod.yml up -d
success "All services started"

# ─── Seed database ────────────────────────────────────────────────────────────
step "STEP 10: Seed Demo Data"

info "Waiting for backend to be ready..."
TIMEOUT=90; ELAPSED=0
while ! curl -sf http://localhost:3001/api/health >/dev/null 2>&1; do
    sleep 5; ELAPSED=$((ELAPSED+5))
    [[ $ELAPSED -ge $TIMEOUT ]] && { warn "Backend belum ready — skip seed, jalankan manual nanti"; SKIP_SEED=1; break; }
    echo -n "."
done
echo ""

if [[ "${SKIP_SEED:-0}" != "1" ]]; then
    docker exec -i alfakhir_postgres psql -U alfakhir -d alfakhir_school \
        < "$INSTALL_DIR/scripts/seed-demo.sql" 2>&1 | tail -15 || warn "Seed mungkin sudah ada — OK"
    success "Demo data seeded"
fi

# ─── Cron jobs ────────────────────────────────────────────────────────────────
step "STEP 11: Setup Cron Jobs"

CRON_FILE="/etc/cron.d/alfakhir-school"
cat > "$CRON_FILE" <<CRON
# Al Fakhir School LMS - Scheduled Tasks
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Daily backup at 02:00 WIB (UTC+7 → 19:00 UTC)
0 19 * * * root bash ${INSTALL_DIR}/scripts/backup.sh >> ${INSTALL_DIR}/logs/backup.log 2>&1

# SSL check & renew at 03:00 WIB (20:00 UTC) - every Monday
0 20 * * 1 root bash ${INSTALL_DIR}/scripts/ssl-renew.sh >> ${INSTALL_DIR}/logs/ssl.log 2>&1

# Health check every 5 minutes
*/5 * * * * root bash ${INSTALL_DIR}/scripts/health-check.sh >> ${INSTALL_DIR}/logs/health.log 2>&1
CRON

chmod 644 "$CRON_FILE"
success "Cron jobs configured"

# ─── Systemd service (auto-restart on reboot) ─────────────────────────────────
step "STEP 12: Systemd Auto-Start"

cat > /etc/systemd/system/alfakhir-school.service <<SERVICE
[Unit]
Description=Al Fakhir School LMS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE

# Fallback: use docker-compose standalone if plugin not available
if ! docker compose version &>/dev/null 2>&1; then
    sed -i 's|/usr/bin/docker compose|/usr/local/bin/docker-compose|g' \
        /etc/systemd/system/alfakhir-school.service
fi

systemctl daemon-reload
systemctl enable alfakhir-school
success "Systemd service enabled (auto-start on reboot)"

# ─── Status check ─────────────────────────────────────────────────────────────
step "STEP 13: Final Status Check"

echo ""
compose_cmd -f docker-compose.prod.yml ps
echo ""

HEALTH=$(curl -sf http://localhost:3001/api/health 2>/dev/null || echo '{}')
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    success "API Health: OK"
else
    warn "API Health: belum ready — cek: docker logs alfakhir_backend"
fi

SERVER_IP=$(curl -sf https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         INSTALASI SELESAI!                              ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Server IP  :${NC} ${SERVER_IP}"
echo -e "${BOLD}Install Dir:${NC} ${INSTALL_DIR}"
echo ""
echo -e "${BOLD}NEXT STEPS:${NC}"
echo ""
echo -e "  ${YELLOW}1. Arahkan DNS records ke IP ${SERVER_IP}:${NC}"
echo -e "     ${DOMAIN_API}   → A → ${SERVER_IP}"
echo -e "     ${DOMAIN_N8N}   → A → ${SERVER_IP}"
echo -e "     ${DOMAIN_MINIO} → A → ${SERVER_IP}"
echo ""
echo -e "  ${YELLOW}2. Pasang SSL (setelah DNS propagate):${NC}"
echo -e "     bash ${INSTALL_DIR}/scripts/ssl-renew.sh"
echo ""
echo -e "  ${YELLOW}3. Verifikasi sistem:${NC}"
echo -e "     cd ${INSTALL_DIR}"
echo -e "     bash scripts/health-check.sh"
echo ""
echo -e "  ${YELLOW}4. Login demo:${NC}"
echo -e "     Admin : admin@alfakhirschool.id / Admin@1234"
echo -e "     Guru  : guru1@alfakhirschool.id / Admin@1234"
echo -e "     Siswa : siswa1@alfakhirschool.id / Admin@1234"
echo ""
echo -e "  ${YELLOW}5. Hapus demo data (production):${NC}"
echo -e "     docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c 'TRUNCATE users CASCADE;'"
echo ""
echo -e "${BOLD}Logs:${NC}"
echo -e "  docker logs alfakhir_backend  -f"
echo -e "  docker logs alfakhir_postgres -f"
echo -e "  tail -f ${INSTALL_DIR}/logs/health.log"
echo ""
