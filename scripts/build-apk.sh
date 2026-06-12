#!/bin/bash
# Build APK/AAB release untuk Play Store
# Jalankan: bash scripts/build-apk.sh [siswa|ortu] [apk|aab]

APP=${1:-siswa}
TYPE=${2:-apk}
ROOT_DIR="/home/Kali-Linux/al-fakhir/alfakhirchool"

if [[ "$APP" == "siswa" ]]; then
  APP_DIR="$ROOT_DIR/siswa_app"
  APP_NAME="alfakhir-siswa"
elif [[ "$APP" == "ortu" ]]; then
  APP_DIR="$ROOT_DIR/orang_tua_app"
  APP_NAME="alfakhir-ortu"
else
  echo "Usage: $0 [siswa|ortu] [apk|aab]"
  exit 1
fi

cd "$APP_DIR" || exit 1

echo "=== Build $APP_NAME ($TYPE) ==="

if ! command -v flutter &>/dev/null; then
  echo "Flutter tidak terinstall!"
  exit 1
fi

echo "Cleaning..."
flutter clean

echo "Getting packages..."
flutter pub get

if [[ "$TYPE" == "aab" ]]; then
  echo "Building App Bundle (Play Store)..."
  flutter build appbundle --release \
    --dart-define=FLUTTER_TARGET=lib/main.dart
  OUTPUT="build/app/outputs/bundle/release/app-release.aab"
else
  echo "Building APK..."
  flutter build apk --release --split-per-abi
  OUTPUT="build/app/outputs/flutter-apk/"
fi

echo ""
echo "=== Build selesai! ==="
echo "Output: $APP_DIR/$OUTPUT"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DIST_DIR="$ROOT_DIR/dist"
mkdir -p "$DIST_DIR"

if [[ "$TYPE" == "aab" ]]; then
  cp "$OUTPUT" "$DIST_DIR/${APP_NAME}_${TIMESTAMP}.aab"
  echo "Saved: $DIST_DIR/${APP_NAME}_${TIMESTAMP}.aab"
else
  ls "$APP_DIR/$OUTPUT"*.apk 2>/dev/null && cp "$APP_DIR/$OUTPUT"*.apk "$DIST_DIR/" && echo "Saved to: $DIST_DIR/"
fi
