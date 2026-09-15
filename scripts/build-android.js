#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  WatchCam — Android APK Builder
//  Run: node scripts/build-android.js
// ─────────────────────────────────────────────────────────────
const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const G  = '\x1b[32m';
const Y  = '\x1b[33m';
const R  = '\x1b[31m';
const B  = '\x1b[36m';
const W  = '\x1b[37m';
const RS = '\x1b[0m';

function ok(m)    { console.log(G+'✓ '+RS+m); }
function info(m)  { console.log(B+'→ '+RS+m); }
function warn(m)  { console.log(Y+'⚠ '+RS+m); }
function fatal(m) { console.log(R+'✗ FATAL: '+RS+m); process.exit(1); }

const ROOT     = path.join(__dirname, '..');
const ANDROID  = path.join(ROOT, 'android');
const ASSETS   = path.join(ANDROID, 'app', 'src', 'main', 'assets');
const WEB_SRC  = path.join(ROOT, 'web', 'watchcam.html');
const GRADLEW  = path.join(ANDROID, process.platform==='win32'?'gradlew.bat':'gradlew');
const OUT_APK  = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const FINAL    = path.join(ROOT, 'dist', 'WatchCam.apk');

console.log('\n'+W+'═══════════════════════════════════════'+RS);
console.log(W+'  WatchCam — Android APK Builder'+RS);
console.log(W+'═══════════════════════════════════════'+RS+'\n');

// ── Check ANDROID_HOME ────────────────────────────────────────
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!androidHome || !fs.existsSync(androidHome)) {
  fatal('ANDROID_HOME not set.\n\nRun first:\n  node scripts/install-sdk.js\n  source ~/.bashrc\n  node scripts/build-android.js');
}
ok('Android SDK: '+androidHome);

// ── Copy web assets ───────────────────────────────────────────
info('Copying web app into Android assets...');
fs.mkdirSync(ASSETS, {recursive:true});

// Try to find watchcam.html in multiple locations
const candidates = [
  path.join(ROOT, 'web', 'watchcam.html'),
  path.join(ROOT, 'watchcam.html'),
  path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'index.html'),
];
let webSrc = null;
for (const c of candidates) {
  if (fs.existsSync(c)) { webSrc = c; break; }
}
if (!webSrc) fatal('watchcam.html not found. Make sure it is in the project folder.');

fs.copyFileSync(webSrc, path.join(ASSETS, 'index.html'));
ok('Web app copied to assets');

// ── Make gradlew executable ───────────────────────────────────
if (process.platform !== 'win32') {
  try { execSync('chmod +x '+GRADLEW); } catch {}
}

// ── Clean previous build ──────────────────────────────────────
info('Cleaning previous build...');
try {
  execSync(GRADLEW+' clean --no-daemon', {
    cwd: ANDROID, stdio:'pipe',
    env: {...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome}
  });
  ok('Cleaned');
} catch {}

// ── Build APK ─────────────────────────────────────────────────
info('Building APK (this takes 3-8 minutes)...');
console.log(Y+'  Please wait — lots of output is normal'+RS+'\n');

const result = spawnSync(GRADLEW, ['assembleDebug','--no-daemon','--stacktrace'], {
  cwd: ANDROID,
  stdio: 'inherit',
  env: {...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome}
});

if (result.status !== 0) {
  fatal('Build failed. Check errors above.\n\nCommon fixes:\n  1. source ~/.bashrc  (re-load SDK path)\n  2. node scripts/install-sdk.js  (re-install SDK)\n  3. Check Java: java -version');
}

// ── Copy to dist ──────────────────────────────────────────────
if (fs.existsSync(OUT_APK)) {
  fs.mkdirSync(path.join(ROOT, 'dist'), {recursive:true});
  fs.copyFileSync(OUT_APK, FINAL);
  const size = (fs.statSync(FINAL).size / 1024 / 1024).toFixed(1);
  console.log('\n'+G+'═══════════════════════════════════════'+RS);
  console.log(G+'  APK built successfully!'+RS);
  console.log(G+'═══════════════════════════════════════'+RS);
  console.log('\n  File: '+W+'dist/WatchCam.apk'+RS+' ('+size+' MB)');
  console.log('\nTo install on your phone:');
  console.log(Y+'  adb install dist/WatchCam.apk'+RS);
  console.log('Or copy the APK file to your phone and open it.\n');
} else {
  fatal('APK not found at expected path: '+OUT_APK);
}
