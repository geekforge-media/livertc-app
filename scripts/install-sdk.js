#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  WatchCam - Termux Android SDK Installer
//  Run: node scripts/install-sdk.js
//  Downloads ~300MB. Use on WiFi.
// ─────────────────────────────────────────────────────────────
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

const G  = '\x1b[32m';
const Y  = '\x1b[33m';
const R  = '\x1b[31m';
const B  = '\x1b[36m';
const W  = '\x1b[37m';
const RS = '\x1b[0m';

function ok(m)   { console.log(G+'✓ '+RS+m); }
function info(m) { console.log(B+'→ '+RS+m); }
function warn(m) { console.log(Y+'⚠ '+RS+m); }
function err(m)  { console.log(R+'✗ '+RS+m); }
function run(cmd, opts={}) { execSync(cmd, {stdio:'inherit', ...opts}); }

const HOME = process.env.HOME || os.homedir();
const SDK_DIR = path.join(HOME, 'android-sdk');
const TOOLS_DIR = path.join(SDK_DIR, 'cmdline-tools', 'latest');
const PROFILE = path.join(HOME, '.bashrc');

// cmdline-tools for linux
const SDK_URL = 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip';
const SDK_ZIP = path.join(HOME, 'cmdline-tools.zip');

async function main() {
  console.log('\n'+W+'═══════════════════════════════════════'+RS);
  console.log(W+'  WatchCam — Android SDK Installer'+RS);
  console.log(W+'═══════════════════════════════════════'+RS+'\n');

  // Check if already installed
  if (fs.existsSync(TOOLS_DIR)) {
    ok('Android SDK already installed at '+SDK_DIR);
    setEnv();
    return;
  }

  // Install unzip if needed
  info('Installing unzip...');
  try { run('pkg install unzip -y'); } catch {}

  // Download SDK tools
  info('Downloading Android SDK tools (~150MB)...');
  info('URL: '+SDK_URL);

  await download(SDK_URL, SDK_ZIP);
  ok('Download complete');

  // Create SDK dir
  fs.mkdirSync(path.join(SDK_DIR, 'cmdline-tools'), { recursive: true });

  // Unzip
  info('Extracting...');
  run('unzip -q '+SDK_ZIP+' -d '+path.join(SDK_DIR, 'cmdline-tools'));

  // Rename to 'latest'
  const extracted = path.join(SDK_DIR, 'cmdline-tools', 'cmdline-tools');
  if (fs.existsSync(extracted)) {
    fs.renameSync(extracted, TOOLS_DIR);
  }

  // Clean up zip
  fs.unlinkSync(SDK_ZIP);
  ok('Extracted');

  // Set env vars
  setEnv();

  // Accept licenses
  info('Accepting Android licenses...');
  try {
    execSync(path.join(TOOLS_DIR,'bin','sdkmanager')+' --licenses',
      {input:'y\ny\ny\ny\ny\ny\ny\n', stdio:['pipe','inherit','inherit'],
       env:{...process.env, ANDROID_HOME:SDK_DIR, ANDROID_SDK_ROOT:SDK_DIR}});
  } catch {}

  // Install platform and build tools
  info('Installing Android platform 34 + build tools (~150MB)...');
  const sdkman = path.join(TOOLS_DIR,'bin','sdkmanager');
  const env = {...process.env, ANDROID_HOME:SDK_DIR, ANDROID_SDK_ROOT:SDK_DIR};
  try {
    execSync(sdkman+' "platform-tools" "platforms;android-34" "build-tools;34.0.0"',
      {stdio:'inherit', env, input:'y\n'});
  } catch(e) {
    warn('sdkmanager error (may be ok): '+e.message.slice(0,100));
  }

  ok('Android SDK ready!');
  console.log('\n'+G+'════════════════════════════════'+RS);
  console.log(G+'  SDK installed successfully!'+RS);
  console.log(G+'════════════════════════════════'+RS);
  console.log('\nNow run:');
  console.log(Y+'  source ~/.bashrc'+RS);
  console.log(Y+'  node scripts/build-android.js'+RS+'\n');
}

function setEnv() {
  const lines = [
    '',
    '# WatchCam Android SDK',
    'export ANDROID_HOME='+SDK_DIR,
    'export ANDROID_SDK_ROOT='+SDK_DIR,
    'export PATH=$PATH:'+path.join(SDK_DIR,'platform-tools'),
    'export PATH=$PATH:'+path.join(TOOLS_DIR,'bin'),
  ];

  let profile = fs.existsSync(PROFILE) ? fs.readFileSync(PROFILE,'utf8') : '';
  if (!profile.includes('WatchCam Android SDK')) {
    fs.appendFileSync(PROFILE, lines.join('\n')+'\n');
    ok('Environment variables added to ~/.bashrc');
  } else {
    ok('Environment variables already in ~/.bashrc');
  }

  // Set for current process
  process.env.ANDROID_HOME = SDK_DIR;
  process.env.ANDROID_SDK_ROOT = SDK_DIR;
  process.env.PATH = process.env.PATH+':'+path.join(SDK_DIR,'platform-tools')+':'+path.join(TOOLS_DIR,'bin');
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let downloaded = 0;
    let total = 0;
    let lastPct = 0;

    function doGet(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doGet(res.headers.location);
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP '+res.statusCode));
          return;
        }
        total = parseInt(res.headers['content-length'] || '0');
        res.on('data', chunk => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0) {
            const pct = Math.floor(downloaded/total*100);
            if (pct >= lastPct+10) {
              process.stdout.write('\r  '+pct+'% ('+Math.floor(downloaded/1024/1024)+'MB / '+Math.floor(total/1024/1024)+'MB)');
              lastPct = pct;
            }
          }
        });
        res.on('end', () => { file.end(); console.log(''); resolve(); });
        res.on('error', reject);
      }).on('error', reject);
    }
    doGet(url);
  });
}

main().catch(e => { err('Fatal: '+e.message); process.exit(1); });
