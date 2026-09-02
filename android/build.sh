#!/usr/bin/env bash
# Builds and signs the JETSTREAM Android shell without Gradle.
#
# Needs: a JDK (javac/keytool), aapt2, dx (or d8), zipalign, apksigner, and an
# android.jar. On Ubuntu/Debian:  apt install aapt android-sdk-platform-23 \
#   android-sdk-build-tools apksigner zipalign dalvik-exchange
# On macOS with the Android SDK installed, set ANDROID_HOME and the script
# finds build-tools/platforms itself.
#
#   ./build.sh                 -> android/out/jetstream.apk (signed)
#   KEYSTORE=... KS_PASS=...   -> use your own keystore (default: android/keystore/jetstream.jks, created on first run)
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR="${ANDROID_JAR:-}"
BT=""
if [[ -n "${ANDROID_HOME:-}" ]]; then
  BT="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -1 || true)"
  [[ -z "$ANDROID_JAR" ]] && ANDROID_JAR="$(ls "$ANDROID_HOME"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -1 || true)"
fi
[[ -z "$ANDROID_JAR" && -f /usr/lib/android-sdk/platforms/android-23/android.jar ]] && ANDROID_JAR=/usr/lib/android-sdk/platforms/android-23/android.jar
[[ -f "$ANDROID_JAR" ]] || { echo "android.jar not found (set ANDROID_JAR or ANDROID_HOME)"; exit 1; }

tool() { # prefer $ANDROID_HOME build-tools, else PATH
  local name="$1"
  if [[ -n "$BT" && -x "$BT/$name" ]]; then echo "$BT/$name"; else command -v "$name" || command -v "${name}.bat" || true; fi
}
AAPT2="$(tool aapt2)"; ZIPALIGN="$(tool zipalign)"; APKSIGNER="$(tool apksigner)"
DX="$(tool d8)"; DX_MODE="d8"
if [[ -z "$DX" ]]; then DX="$(tool dx)"; DX_MODE="dx"; fi
if [[ -z "$DX" ]]; then DX="$(command -v dalvik-exchange || true)"; DX_MODE="dx"; fi
for t in "$AAPT2" "$ZIPALIGN" "$APKSIGNER" "$DX"; do [[ -n "$t" ]] || { echo "missing build tool (aapt2/zipalign/apksigner/dx)"; exit 1; }; done

SRC=app/src/main
OUT=out; BUILD=build
rm -rf "$BUILD" && mkdir -p "$BUILD/res" "$BUILD/gen" "$BUILD/classes" "$OUT"

echo "▸ compiling resources"
"$AAPT2" compile --dir "$SRC/res" -o "$BUILD/res.zip"

echo "▸ linking"
"$AAPT2" link -o "$BUILD/base.apk" -I "$ANDROID_JAR" \
  --manifest "$SRC/AndroidManifest.xml" -A "$SRC/assets" --java "$BUILD/gen" \
  --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay \
  "$BUILD/res.zip"

echo "▸ compiling java"
find "$SRC/java" "$BUILD/gen" -name '*.java' > "$BUILD/sources.txt"
javac --release 8 -Xlint:-options -cp "$ANDROID_JAR" -d "$BUILD/classes" @"$BUILD/sources.txt"

echo "▸ dexing ($DX_MODE)"
if [[ "$DX_MODE" == "d8" ]]; then
  "$DX" --release --min-api 24 --lib "$ANDROID_JAR" --output "$BUILD" $(find "$BUILD/classes" -name '*.class')
else
  "$DX" --dex --min-sdk-version=24 --output="$BUILD/classes.dex" "$BUILD/classes"
fi

echo "▸ packaging"
cp "$BUILD/base.apk" "$BUILD/unaligned.apk"
( cd "$BUILD" && zip -q -j unaligned.apk classes.dex )
"$ZIPALIGN" -f -p 4 "$BUILD/unaligned.apk" "$BUILD/aligned.apk"

KEYSTORE="${KEYSTORE:-keystore/jetstream.jks}"
KS_PASS="${KS_PASS:-jetstream-dev}"
KEY_ALIAS="${KEY_ALIAS:-jetstream}"
if [[ ! -f "$KEYSTORE" ]]; then
  echo "▸ creating signing key at $KEYSTORE (keep it — future builds must use the same key to update the app)"
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=JETSTREAM, O=Tama OS, L=Honolulu, ST=HI, C=US" >/dev/null 2>&1
fi

echo "▸ signing"
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" --ks-key-alias "$KEY_ALIAS" \
  --v1-signing-enabled true --v2-signing-enabled true --out "$OUT/jetstream.apk" "$BUILD/aligned.apk"
"$APKSIGNER" verify --print-certs "$OUT/jetstream.apk" | head -3
ls -la "$OUT/jetstream.apk"
echo "✓ $OUT/jetstream.apk"
