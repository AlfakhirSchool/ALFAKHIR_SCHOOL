#!/bin/bash
# Setup script untuk siswa_app
# Jalankan: bash setup.sh

set -e

echo "=== Al Fakhir School - Siswa App Setup ==="

# Check Flutter
if ! command -v flutter &> /dev/null; then
  echo "Flutter belum terinstall."
  echo "Download Flutter: https://docs.flutter.dev/get-started/install"
  exit 1
fi

flutter --version

# Create temp project untuk get Android/iOS boilerplate
TEMP_DIR=$(mktemp -d)
echo "Membuat project Flutter sementara..."
flutter create --org id.alfakhirschool --project-name siswa_app "$TEMP_DIR/siswa_app"

# Copy boilerplate files (android, ios, test, etc)
echo "Mengcopy file boilerplate..."
cp -r "$TEMP_DIR/siswa_app/android" ./android 2>/dev/null || true
cp -r "$TEMP_DIR/siswa_app/ios" ./ios 2>/dev/null || true
cp "$TEMP_DIR/siswa_app/analysis_options.yaml" . 2>/dev/null || true

# Cleanup
rm -rf "$TEMP_DIR"

# Create assets directories
mkdir -p assets/images assets/fonts

echo "Menjalankan flutter pub get..."
flutter pub get

echo ""
echo "=== Setup selesai! ==="
echo ""
echo "Langkah selanjutnya:"
echo "1. Tambahkan font Poppins ke assets/fonts/ (download dari Google Fonts)"
echo "2. Update android/app/build.gradle - minSdk ke 21"
echo "3. Run: flutter run"
echo ""
echo "Untuk APK release:"
echo "  flutter build apk --release"
