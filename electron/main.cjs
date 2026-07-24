const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

// Disable hardware acceleration to prevent Windows transparent window DWM GPU crashes (exit_code=-1073741819)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-compositing');

// Set isolated user data directory to prevent Windows file sharing locks (Error code: 32)
const sessionUserData = path.join(app.getPath('temp'), 'aetheris_hud_session_' + Date.now());
app.setPath('userData', sessionUserData);

console.log('====================================================');
console.log('   AETHERIS OS ELECTRON DESKTOP OVERLAY LAUNCHER    ');
console.log('====================================================');

let mainWindow = null;
let tray = null;

function checkUrlLive(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function createWindow() {
  console.log('[LOG] Creating BrowserWindow with Rock-Solid Windows DWM Compositing...');
  
  mainWindow = new BrowserWindow({
    width: 540,
    height: 780,
    x: 120,
    y: 100,
    frame: false,
    transparent: false, // Prevents GPU compositing crash on Windows
    alwaysOnTop: true,
    resizable: true,
    hasShadow: true,
    show: true,
    backgroundColor: '#040d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  const devUrl = 'http://localhost:3000';
  const isDevLive = await checkUrlLive(devUrl);

  if (isDevLive) {
    console.log('[LOG] Connecting to Vite dev server at:', devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('[LOG] Loading local production build at:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[LOG] Window WebContents finished loading successfully!');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[ERROR] Window failed to load [${errorCode}]: ${errorDescription}`);
  });

  const toggleVisibility = (sourceKey) => {
    console.log(`[KEYBIND] Hotkey triggered by ${sourceKey}!`);
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      console.log('[LOG] Hiding overlay window...');
      mainWindow.hide();
    } else {
      console.log('[LOG] Showing & focusing overlay window...');
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  };

  globalShortcut.unregisterAll();

  const keysToRegister = [
    { key: 'Alt+M', name: 'Alt+M' },
    { key: 'Alt+Space', name: 'Alt+Space' },
    { key: 'CommandOrControl+Space', name: 'Ctrl+Space' },
    { key: 'F9', name: 'F9 Key' },
    { key: 'F8', name: 'F8 Key' },
    { key: 'F11', name: 'F11 Fullscreen' },
    { key: 'CommandOrControl+Shift+M', name: 'Ctrl+Shift+M' },
  ];

  keysToRegister.forEach(({ key, name }) => {
    const success = globalShortcut.register(key, () => toggleVisibility(name));
    if (success) {
      console.log(`[LOG] Registered global shortcut: ${name} (${key}) - SUCCESS`);
    } else {
      console.warn(`[WARN] Failed to register global shortcut: ${name} (${key}) - MIGHT BE IN USE BY ANOTHER APP`);
    }
  });

  try {
    const icon = nativeImage.createFromNamedImage('NSActionTemplate');
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Aetheris HUD Overlay v1.0', enabled: false },
      { type: 'separator' },
      { label: 'Show Overlay (Alt+M / F9 / Ctrl+Space)', click: () => toggleVisibility('System Tray Menu') },
      { label: 'Hide Overlay', click: () => mainWindow && mainWindow.hide() },
      { label: 'Toggle Fullscreen (F11)', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      { label: 'Toggle DevTools', click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
      { type: 'separator' },
      { label: 'Exit Aetheris', click: () => app.quit() },
    ]);
    tray.setToolTip('Aetheris OS Music Overlay');
    tray.setContextMenu(contextMenu);
    console.log('[LOG] System Tray created successfully.');
  } catch (err) {
    console.warn('[WARN] System tray note:', err);
  }

  mainWindow.on('closed', () => {
    console.log('[LOG] Window closed.');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[LOG] Electron app is ready.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('[LOG] All windows closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log('[LOG] App quitting. Unregistering global shortcuts.');
  globalShortcut.unregisterAll();
});

ipcMain.on('toggle-always-on-top', (event, flag) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(flag, 'screen-saver');
});

ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFS = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFS);
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});
