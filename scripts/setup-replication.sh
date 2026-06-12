#!/bin/bash
# PostgreSQL 14 Streaming Replication Setup
# Jalankan di PRIMARY server: bash scripts/setup-replication.sh primary <standby_ip>
# Jalankan di STANDBY server: bash scripts/setup-replication.sh standby <primary_ip>

set -euo pipefail

ROLE=${1:-primary}
REMOTE_IP=${2:-""}
REPLICATION_USER="replicator"
REPLICATION_SLOT="alfakhir_slot_1"
PG_DATA="/var/lib/postgresql/14/main"
PG_CONF="$PG_DATA/postgresql.conf"
PG_HBA="$PG_DATA/pg_hba.conf"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

[[ -z "$REMOTE_IP" ]] && error "Gunakan: $0 [primary|standby] <remote_ip>"

if [[ "$ROLE" == "primary" ]]; then
  log "=== Setup PRIMARY node ==="

  log "Membuat user replication..."
  sudo -u postgres psql -c "CREATE USER $REPLICATION_USER WITH REPLICATION ENCRYPTED PASSWORD 'rep_$(openssl rand -hex 16)';" 2>/dev/null || true

  log "Membuat replication slot..."
  sudo -u postgres psql -c "SELECT pg_create_physical_replication_slot('$REPLICATION_SLOT');" 2>/dev/null || true

  log "Update postgresql.conf..."
  sudo bash -c "cat >> $PG_CONF << EOF

# Replication - added by setup-replication.sh
wal_level = replica
max_wal_senders = 5
max_replication_slots = 5
synchronous_commit = on
wal_keep_size = 512
hot_standby = on
EOF"

  log "Update pg_hba.conf..."
  sudo bash -c "echo 'host replication $REPLICATION_USER $REMOTE_IP/32 md5' >> $PG_HBA"

  log "Reload PostgreSQL..."
  sudo systemctl reload postgresql

  log "PRIMARY setup selesai. Standby IP: $REMOTE_IP"
  log "Simpan password user '$REPLICATION_USER' dari output di atas!"

elif [[ "$ROLE" == "standby" ]]; then
  log "=== Setup STANDBY node ==="

  log "Stop PostgreSQL..."
  sudo systemctl stop postgresql

  log "Hapus data direktori lama..."
  sudo rm -rf "$PG_DATA"/*

  log "Jalankan pg_basebackup dari primary ($REMOTE_IP)..."
  read -rsp "Masukkan password user '$REPLICATION_USER': " REP_PASS
  echo ""

  PGPASSWORD="$REP_PASS" sudo -u postgres pg_basebackup \
    -h "$REMOTE_IP" \
    -U "$REPLICATION_USER" \
    -D "$PG_DATA" \
    -P -Xs -R \
    --slot="$REPLICATION_SLOT"

  log "Buat standby.signal..."
  sudo -u postgres touch "$PG_DATA/standby.signal"

  log "Update postgresql.conf standby..."
  sudo bash -c "cat >> $PG_DATA/postgresql.conf << EOF

# Standby - added by setup-replication.sh
primary_conninfo = 'host=$REMOTE_IP port=5432 user=$REPLICATION_USER password=$REP_PASS'
primary_slot_name = '$REPLICATION_SLOT'
hot_standby = on
recovery_target_timeline = 'latest'
EOF"

  log "Start PostgreSQL standby..."
  sudo systemctl start postgresql

  log "Cek status replikasi..."
  sleep 5
  sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"

  log "STANDBY setup selesai!"
  log "Pada PRIMARY, jalankan: SELECT * FROM pg_stat_replication;"
fi
