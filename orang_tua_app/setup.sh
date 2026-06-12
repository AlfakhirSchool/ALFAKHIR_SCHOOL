#!/bin/bash
# Setup script untuk orang_tua_app
# Jalankan: bash setup.sh

set -e

echo "=== Al Fakhir School - Orang Tua App Setup ==="

if ! command -v flutter &> /dev/null; then
  echo "Flutter belum terinstall."
  echo "Download Flutter: https://docs.flutter.dev/get-started/install"
  exit 1
fi

flutter --version

TEMP_DIR=$(mktemp -d)
echo "Membuat project Flutter sementara..."
flutter create --org id.alfakhirschool --project-name orang_tua_app "$TEMP_DIR/orang_tua_app"

echo "Mengcopy file boilerplate..."
cp -r "$TEMP_DIR/orang_tua_app/android" ./android 2>/dev/null || true
cp -r "$TEMP_DIR/orang_tua_app/ios" ./ios 2>/dev/null || true
cp "$TEMP_DIR/orang_tua_app/analysis_options.yaml" . 2>/dev/null || true

rm -rf "$TEMP_DIR"

mkdir -p assets/images assets/fonts

echo "Menjalankan flutter pub get..."
flutter pub get

echo ""
echo "=== Setup selesai! ==="
echo ""
echo "Langkah selanjutnya:"
echo "1. Tambahkan font Poppins ke assets/fonts/"
echo "2. Update android/app/build.gradle - minSdk ke 21"
echo "3. Run: flutter run"
