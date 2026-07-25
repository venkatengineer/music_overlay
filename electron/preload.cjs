const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: (flag) => ipcRenderer.send('toggle-always-on-top', flag),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  closeWindow: () => ipcRenderer.send('close-window'),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  onSpotifyAuthCode: (callback) => {
    ipcRenderer.on('spotify-auth-code', (event, code) => callback(code));
  },
  onWindowVisibilityChanged: (callback) => {
    ipcRenderer.on('window-visibility-changed', (event, isVisible) => callback(isVisible));
  },
});
