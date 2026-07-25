const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, screen, shell } = require('electron');
const path = require('path');
const http = require('http');

// Enforce single instance lock so duplicate processes don't conflict on ports or shortcuts
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[LOG] Another instance of Aetheris OS is already running. Exiting duplicate...');
  app.quit();
  process.exit(0);
}

// Enable GPU Hardware Acceleration for buttery-smooth 60-144 FPS rendering
// Use persistent appData directory so Spotify tokens, settings, and login remain saved forever across restarts
const sessionUserData = path.join(app.getPath('appData'), 'aetheris_alien_music_overlay_data');
app.setPath('userData', sessionUserData);

console.log('====================================================');
console.log('   AETHERIS OS ELECTRON DESKTOP OVERLAY LAUNCHER    ');
console.log('====================================================');

let mainWindow = null;
let tray = null;
let oauthServer = null;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

function startOAuthServer(portsToTry = [3000, 3001, 3002, 3003]) {
  if (oauthServer) return;

  const tryPort = (portIndex) => {
    if (portIndex >= portsToTry.length) {
      console.warn('[WARN] OAuth server: all ports in use, loopback redirect unavailable.');
      return;
    }
    const port = portsToTry[portIndex];

    try {
      oauthServer = http.createServer((req, res) => {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        const code = reqUrl.searchParams.get('code');

        if (code && mainWindow) {
          console.log('[RUNTIME LOG] Electron received auth code:', code);
          console.log('[RUNTIME LOG] IPC event sent: spotify-auth-code');
          mainWindow.webContents.send('spotify-auth-code', code);
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Aetheris OS - Spotify Connected</title>
                <style>
                  body { background: #040d12; color: #00ffaa; font-family: monospace; text-align: center; padding-top: 40px; }
                  .card { border: 1.5px solid #00ffaa; border-radius: 16px; padding: 25px; display: inline-block; box-shadow: 0 0 25px #00ffaa; background: #061822; }
                  h2 { margin: 0; font-size: 24px; letter-spacing: 2px; }
                  p { color: #00e5ff; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h2>🛸 AETHERIS OS</h2>
                  <h4 style="color:#ffffff;">SPOTIFY AUTHORIZATION SUCCESSFUL!</h4>
                  <p>Syncing live music stream with HUD overlay...</p>
                </div>
                <script>
                  if (window.opener) {
                    try { window.opener.postMessage({ type: 'SPOTIFY_AUTH_CODE', code: ${JSON.stringify(code)} }, '*'); } catch(e) {}
                  }
                  setTimeout(() => window.close(), 1000);
                </script>
              </body>
            </html>
          `);
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
        res.end('Aetheris OS OAuth Receiver Active');
      });

      oauthServer.listen(port, '127.0.0.1', () => {
        console.log(`[LOG] Spotify OAuth Loopback Receiver active at http://127.0.0.1:${port}/`);
      });

      oauthServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[WARN] Port ${port} is in use, trying next port...`);
          oauthServer = null;
          tryPort(portIndex + 1);
        } else {
          console.warn('[WARN] OAuth server note:', err.message);
        }
      });
    } catch (e) {
      console.warn('[WARN] Could not start OAuth loopback server:', e);
    }
  };

  tryPort(0);
}


async function createWindow() {
  console.log('[LOG] Creating Full Desktop Screen BrowserWindow with Transparency...');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    show: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.includes('Third-party cookie') || message.includes('Electron Security Warning')) return;
    console.log('[RENDERER LOG]', message);
  });

  // Configure popup handler so Spotify Auth popup floats ON TOP of screen-saver overlay
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[LOG] Intercepted window.open request for URL:', url);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        alwaysOnTop: true,
        autoHideMenuBar: true,
        center: true,
        width: 550,
        height: 750,
        resizable: true,
        frame: true,
        title: 'Spotify Authorization',
      },
    };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    console.log('[LOG] Child popup window created! Forcing to front above overlay...');
    childWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    childWindow.show();
    childWindow.focus();

    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  // Clear Chromium disk cache so local dist bundle updates always load fresh code!
  try {
    mainWindow.webContents.session.clearCache();
  } catch (e) {}

  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('[LOG] Loading fresh production build at:', indexPath);
  mainWindow.loadFile(indexPath, { search: `v=${Date.now()}` });

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
      console.log('[LOG] Hiding overlay window & notifying renderer...');
      mainWindow.hide();
      try { mainWindow.webContents.send('window-visibility-changed', false); } catch(e) {}
    } else {
      console.log('[LOG] Showing & focusing overlay window & notifying renderer...');
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      try { mainWindow.webContents.send('window-visibility-changed', true); } catch(e) {}
    }
  };

  globalShortcut.unregisterAll();

  // Try shortcuts from most unique to most common — stop at first success
  const keysToTry = [
    { key: 'CommandOrControl+Alt+M', name: 'Ctrl+Alt+M' },
    { key: 'CommandOrControl+Shift+M', name: 'Ctrl+Shift+M' },
    { key: 'Alt+M', name: 'Alt+M' },
    { key: 'F9', name: 'F9' },
    { key: 'F8', name: 'F8' },
    { key: 'CommandOrControl+Alt+Space', name: 'Ctrl+Alt+Space' },
    { key: 'Alt+Shift+M', name: 'Alt+Shift+M' },
  ];

  let registeredCount = 0;
  keysToTry.forEach(({ key, name }) => {
    try {
      const ok = globalShortcut.register(key, () => toggleVisibility(name));
      if (ok) {
        console.log(`[LOG] Registered global shortcut: ${name} (${key}) ✓`);
        registeredCount++;
      } else {
        console.warn(`[WARN] Could not register shortcut: ${name} - likely in use by another process`);
      }
    } catch (e) {
      console.warn(`[WARN] Error registering ${name}:`, e.message);
    }
  });

  if (registeredCount === 0) {
    console.warn('[WARN] No global shortcuts registered! Use the System Tray to show/hide the overlay.');
  }

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
  startOAuthServer();
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
  if (oauthServer) oauthServer.close();
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

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options || { forward: true });
  }
});


