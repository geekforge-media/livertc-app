# WatchCam — Build Instructions

## Build APK on Android (Termux)

### Step 1 — Install dependencies (one time)
```
pkg install nodejs openjdk-17 -y
```

### Step 2 — Install SDK (one time, needs WiFi ~300MB)
```
node scripts/install-sdk.js
source ~/.bashrc
```

### Step 3 — Build APK
```
node scripts/build-android.js
```
APK will be at: `dist/WatchCam.apk`

### Step 4 — Install APK
Copy `dist/WatchCam.apk` to your phone and open it.
Or if using adb: `adb install dist/WatchCam.apk`

---

## Build Windows EXE (on any PC with Node.js)

```
node scripts/build-windows.js
```
EXE will be at: `dist/WatchCam*.exe`

---

## Admin password
Default: `watchcam2024`
Change it in `web/watchcam.html` — search for `ADMIN_PASS`

## Firebase
Already configured with your project.
Make sure Realtime Database rules allow read/write.
