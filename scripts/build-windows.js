#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  WatchCam — Windows EXE Builder (Electron)
//  Run: node scripts/build-windows.js
//  Works on Windows. Cross-compile from Linux also supported.
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
function fatal(m) { console.log(R+'✗ FATAL: '+RS+m); process.exit(1); }

const ROOT     = path.join(__dirname, '..');
const ELECTRON = path.join(ROOT, 'electron');
const DIST     = path.join(ROOT, 'dist');

console.log('\n'+W+'═══════════════════════════════════════'+RS);
console.log(W+'  WatchCam — Windows EXE Builder'+RS);
console.log(W+'═══════════════════════════════════════'+RS+'\n');

// ── Copy web app into electron folder ─────────────────────────
info('Copying web app...');
fs.mkdirSync(ELECTRON, {recursive:true});

const candidates = [
  path.join(ROOT, 'web', 'watchcam.html'),
  path.join(ROOT, 'watchcam.html'),
];
let webSrc = null;
for (const c of candidates) {
  if (fs.existsSync(c)) { webSrc = c; break; }
}
if (!webSrc) {
  // Try assets folder
  const assetSrc = path.join(ROOT,'android','app','src','main','assets','index.html');
  if (fs.existsSync(assetSrc)) webSrc = assetSrc;
}
if (!webSrc) fatal('watchcam.html not found.');

fs.copyFileSync(webSrc, path.join(ELECTRON, 'index.html'));
ok('Web app copied');

// ── Write Electron main.js ────────────────────────────────────
info('Writing Electron main.js...');
const mainJs = `
const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    title: 'WatchCam',
    backgroundColor: '#0b0f14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    autoHideMenuBar: true,
    show: false
  });

  // Grant camera, mic, and notification permissions automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'camera', 'microphone'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  // Remove menu bar
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  // Keep running in background when closed (minimize to tray on Windows)
  win.on('close', e => {
    if (process.platform !== 'darwin') {
      // On Windows, hide instead of quit so stream continues
      e.preventDefault();
      win.hide();
    }
  });
}

// Keep app running in background
app.on('window-all-closed', () => {
  // Don't quit — stay in background so stream continues
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else win.show();
});

app.whenReady().then(createWindow);
`;

fs.writeFileSync(path.join(ELECTRON, 'main.js'), mainJs.trim());
ok('main.js written');

// ── Write electron package.json ───────────────────────────────
info('Writing electron/package.json...');
const pkg = {
  name: 'watchcam',
  version: '1.0.0',
  description: 'WatchCam - Continuous camera streaming',
  main: 'main.js',
  scripts: { start: 'electron .' },
  build: {
    appId: 'com.watchcam.app',
    productName: 'WatchCam',
    copyright: 'WatchCam',
    win: {
      target: [{ target: 'portable', arch: ['x64'] }],
      requestedExecutionLevel: 'asInvoker'
    },
    linux: {
      target: [{ target: 'AppImage', arch: ['x64'] }]
    },
    directories: { output: path.join(DIST) },
    files: ['**/*'],
    asar: true
  }
};
fs.writeFileSync(path.join(ELECTRON, 'package.json'), JSON.stringify(pkg, null, 2));
ok('package.json written');

// ── Install electron + builder ────────────────────────────────
info('Installing Electron (~120MB)...');
const install = spawnSync('npm', ['install','--save-dev','electron@latest','electron-builder@latest'], {
  cwd: ELECTRON, stdio:'inherit', shell: true
});
if (install.status !== 0) fatal('npm install failed');
ok('Electron installed');

// ── Build ─────────────────────────────────────────────────────
info('Building Windows EXE...');
const platform = process.platform === 'win32' ? '--win' : '--win --x64';
const build = spawnSync('npx', ['electron-builder', ...platform.split(' '), '--publish', 'never'], {
  cwd: ELECTRON, stdio:'inherit', shell: true,
  env: {...process.env, CSC_IDENTITY_AUTO_DISCOVERY:'false'}
});

if (build.status !== 0) {
  // Try without code signing
  info('Retrying without signing...');
  const build2 = spawnSync('npx', ['electron-builder','--win','portable','--publish','never'], {
    cwd: ELECTRON, stdio:'inherit', shell:true,
    env:{...process.env, CSC_IDENTITY_AUTO_DISCOVERY:'false', WIN_CSC_LINK:'', CSC_LINK:''}
  });
  if (build2.status !== 0) fatal('Build failed. Check errors above.');
}

// ── Find output ───────────────────────────────────────────────
fs.mkdirSync(DIST, {recursive:true});
const files = fs.readdirSync(DIST).filter(f=>f.endsWith('.exe'));
if (files.length > 0) {
  console.log('\n'+G+'═══════════════════════════════════════'+RS);
  console.log(G+'  Windows EXE built successfully!'+RS);
  console.log(G+'═══════════════════════════════════════'+RS);
  files.forEach(f => {
    const size=(fs.statSync(path.join(DIST,f)).size/1024/1024).toFixed(0);
    console.log('\n  File: '+W+'dist/'+f+RS+' ('+size+' MB)');
  });
  console.log('\nCopy the .exe to any Windows PC and run it directly.\nNo installation needed — it is portable.\n');
} else {
  // Check electron dist subfolder
  const sub = path.join(DIST,'win-unpacked');
  if (fs.existsSync(sub)) {
    ok('Built to dist/win-unpacked/ folder');
  } else {
    console.log(Y+'Build completed but EXE location unclear. Check the dist/ folder.'+RS);
  }
}
