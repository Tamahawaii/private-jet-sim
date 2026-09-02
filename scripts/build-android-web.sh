#!/usr/bin/env bash
# Produces the static web bundle the Android shell ships inside the APK.
#
# A static export cannot contain API route handlers or dynamic path segments,
# so those directories are set aside for the duration of the build (the web
# build on Vercel keeps them). Output lands in android/app/src/main/assets/www.
set -euo pipefail
cd "$(dirname "$0")/.."

STASH=".android-export-stash"
DIRS=(
  "app/api"
  "app/flight/[flightId]"
  "app/events/[eventId]"
  "app/resorts/[resortId]"
  "app/fleet/[tailNumber]"
  "app/social/[personaId]"
  "app/social/dms/[personaId]"
  "app/social/custom/[id]"
)

restore() {
  if [[ -d "$STASH" ]]; then
    for d in "${DIRS[@]}"; do
      key="${d//\//__}"
      if [[ -e "$STASH/$key" ]]; then
        rm -rf "$d"
        mkdir -p "$(dirname "$d")"
        mv "$STASH/$key" "$d"
      fi
    done
    rm -rf "$STASH"
  fi
}
trap restore EXIT

rm -rf "$STASH" && mkdir -p "$STASH"
for d in "${DIRS[@]}"; do
  if [[ -e "$d" ]]; then mv "$d" "$STASH/${d//\//__}"; fi
done

rm -rf .next-android
JETSTREAM_TARGET=android npx next build

DEST="android/app/src/main/assets/www"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -R .next-android/. "$DEST/"
rm -rf "$DEST/cache" "$DEST/server" "$DEST/types" 2>/dev/null || true
# Keep the APK lean: drop source maps and the unused subsets of the variable fonts
find "$DEST" -name '*.map' -delete
du -sh "$DEST"
echo "✓ static bundle at $DEST"
