#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  WatchCam Setup Script
//  Run: node scripts/setup.js
//  Checks environment, installs deps, tells you what to do next
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

function ok(msg)   { console.log(G + '✓ ' + RS + msg); }
function warn(msg) { console.log(Y + '⚠ ' + RS + msg); }
function err(msg)  { console.log(R + '✗ ' + RS + msg); }
function info(msg) { console.log(B + '→ ' + RS + msg); }
function title(msg){ console.log('\n' + W + msg + RS); }

function run(cmd, opts={}) {
  try {
    return execSync(cmd, { stdio:'pipe', ...opts }).toString().trim();
  } catch(e) {
    return null;
  }
}

function checkCmd(cmd) {
  return run('which ' + cmd) !== null || run('where ' + cmd) !== null;
}

console.log('\n' + W + '════════════════════════════════════' + RS);
console.log(W + '  WatchCam Setup' + RS);
console.log(W + '════════════════════════════════════' + RS);

let allGood = true;
const isTermux = process.env.PREFIX && process.env.PREFIX.includes('com.termux');
const isWindows = process.platform === 'win32';

// ── Node.js ──────────────────────────────────────────────────
title('Checking Node.js...');
const nodeVer = process.version;
const nodeMajor = parseInt(nodeVer.slice(1));
if (nodeMajor >= 16) {
  ok('Node.js ' + nodeVer);
} else {
  err('Node.js 16+ required. You have ' + nodeVer);
  allGood = false;
}

// ── Java ─────────────────────────────────────────────────────
title('Checking Java...');
const javaVer = run('java -version 2>&1') || run('java --version');
if (javaVer) {
  ok('Java found: ' + javaVer.split('\n')[0]);
} else {
  err('Java not found');
  if (isTermux) {
    warn('Install with: pkg install openjdk-17');
  } else if (isWindows) {
    warn('Download from: https://adoptium.net');
  }
  allGood = false;
}

// ── Android SDK ───────────────────────────────────────────────
title('Checking Android SDK...');
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (androidHome && fs.existsSync(androidHome)) {
  ok('Android SDK: ' + androidHome);
} else {
  err('ANDROID_HOME not set or SDK not found');
  if (isTermux) {
    warn('We will install it automatically. Run: node scripts/install-sdk.js');
  } else {
    warn('Download Android Studio or command-line tools from:');
    warn('https://developer.android.com/studio#command-line-tools-only');
  }
  allGood = false;
}

// ── Gradle ────────────────────────────────────────────────────
title('Checking Gradle...');
const gradlePath = path.join(__dirname, '..', 'android', 'gradlew');
if (fs.existsSync(gradlePath)) {
  ok('Gradle wrapper found');
} else {
  err('Gradle wrapper missing');
  allGood = false;
}

// ── Summary ───────────────────────────────────────────────────
console.log('\n' + W + '════════════════════════════════════' + RS);
if (allGood) {
  console.log(G + '  All checks passed! Ready to build.' + RS);
  console.log(W + '════════════════════════════════════' + RS);
  console.log('\nNext steps:');
  info('Build Android APK:  node scripts/build-android.js');
  info('Build Windows EXE:  node scripts/build-windows.js');
} else {
  console.log(Y + '  Some checks failed. Fix above issues first.' + RS);
  console.log(W + '════════════════════════════════════' + RS);
  if (isTermux) {
    console.log('\n' + Y + 'Quick fix for Termux:' + RS);
    console.log('  node scripts/install-sdk.js');
    console.log('(Downloads and sets up Android SDK automatically)');
  }
}
console.log('');
