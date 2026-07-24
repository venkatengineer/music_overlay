const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: (flag) => ipcRenderer.send('toggle-always-on-top', flag),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onSpotifyAuthCode: (callback) => {
    ipcRenderer.on('spotify-auth-code', (event, code) => callback(code));
  },
});
