# JETSTREAM Android shell

A small native Android app (no Gradle, no androidx) that wraps the live game at
`https://private-jet-sim.vercel.app/` in a full-screen, WebGL-ready WebView:

- branded cold-start splash + boarding screen, immersive full screen, keep-awake
- game links stay in-app; everything else opens in the browser
- offline page with retry (flights keep moving on real timestamps, so nothing is lost)
- save export → Android share sheet (Drive, Files, mail); save import → file picker
- `window.JetstreamNative` bridge: `vibrate(ms)`, `saveFile(name, base64, mime)`, `reload()`, `isNative()`
- Android back = web back, double-tap to leave

Because it loads the live site, shipping game updates only needs a Vercel deploy — rebuild the APK only to
change the shell itself (icon, splash, bridge, URL).

## Build

```bash
# Ubuntu/Debian (what produced the shipped APK)
sudo apt install aapt android-sdk-platform-23 android-sdk-build-tools apksigner zipalign dalvik-exchange zip
./build.sh                     # → out/jetstream.apk

# macOS with Android Studio's SDK
export ANDROID_HOME=~/Library/Android/sdk
./build.sh
```

The first run creates `keystore/jetstream.jks` (password `jetstream-dev`). **Keep it** — Android only
installs an update over an existing app when both APKs are signed with the same key. `KEYSTORE=... KS_PASS=...`
override the defaults.

Install on a phone: copy `out/jetstream.apk` over (or `adb install -r out/jetstream.apk`) and allow
installs from that source when prompted.
