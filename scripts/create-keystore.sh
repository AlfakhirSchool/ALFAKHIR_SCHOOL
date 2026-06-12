#!/bin/bash
# Buat keystore untuk Android release
# Jalankan: bash scripts/create-keystore.sh [siswa|ortu]

APP=${1:-siswa}
KEYSTORE_DIR="$HOME/.alfakhir-keystores"
mkdir -p "$KEYSTORE_DIR"

echo "=== Membuat keystore untuk al-fakhir-${APP} ==="

if [[ "$APP" == "siswa" ]]; then
  ALIAS="alfakhir-siswa"
  DNAME="CN=Al Fakhir Siswa App, OU=Mobile, O=Al Fakhir School, L=Jakarta, ST=DKI Jakarta, C=ID"
  KEYSTORE="$KEYSTORE_DIR/alfakhir-siswa-release.jks"
elif [[ "$APP" == "ortu" ]]; then
  ALIAS="alfakhir-ortu"
  DNAME="CN=Al Fakhir Orang Tua App, OU=Mobile, O=Al Fakhir School, L=Jakarta, ST=DKI Jakarta, C=ID"
  KEYSTORE="$KEYSTORE_DIR/alfakhir-ortu-release.jks"
else
  echo "Usage: $0 [siswa|ortu]"
  exit 1
fi

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore sudah ada: $KEYSTORE"
  read -p "Overwrite? (y/N): " confirm
  [[ "$confirm" != "y" ]] && exit 0
fi

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias "$ALIAS" \
  -keystore "$KEYSTORE" \
  -dname "$DNAME"

echo ""
echo "=== Keystore berhasil dibuat! ==="
echo "Path: $KEYSTORE"
echo "Alias: $ALIAS"
echo ""
echo "Tambahkan ke android/key.properties:"
echo "storePassword=<password_anda>"
echo "keyPassword=<password_anda>"
echo "keyAlias=$ALIAS"
echo "storeFile=$KEYSTORE"
echo ""
echo "PENTING: Backup keystore ini! Hilang = tidak bisa update app di Play Store!"
