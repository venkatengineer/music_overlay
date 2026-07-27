# 🛸 Aetheris OS: Futuristic Holographic Desktop Music Overlay

> **Aetheris** is an extraterrestrial holographic HUD desktop music overlay for Windows, featuring 3D tilt CD physics, real-time reactive plasma audio visualizers, song genre auto-morphing themes, vinyl scratching, galactic catalog search, queue management, and Windows system-wide global hotkeys (`Alt+M` / `Ctrl+Shift+M`).

---

## 🚀 FOR USERS (Quick Start Guide)

### 1. Download & Install
1. Go to the [GitHub Releases](https://github.com/venkatengineer/music_overlay/releases) page.
2. Download the latest installer: **`Aetheris-Setup-1.0.0.exe`**.
3. Run `Aetheris-Setup-1.0.0.exe` and follow the setup wizard to install Aetheris.

### 2. Connect Spotify
1. Launch **Aetheris** from your Start Menu or Desktop shortcut.
2. On the first-run screen, click **`[ 🛸 CONNECT SPOTIFY ]`**.
3. Sign into your Spotify account and grant authorization.
4. Once authenticated, Aetheris will automatically sync your live track, album artwork, queue, and playback controls!

### 3. Usage & Hotkeys
- **Summon / Hide Overlay**: Press `Alt+M` or `Ctrl+Shift+M` anywhere on your computer (even while gaming or working in other full-screen apps).
- **Play / Pause**: Press `Space`.
- **Previous / Next Track**: Press `Left Arrow` / `Right Arrow`.
- **DJ Vinyl Scratching**: Click and drag on the 3D rotating CD platter to scratch audio in real-time.
- **Windows Auto-Start**: Open Settings (⚙ gear icon) and toggle **"Start Aetheris with Windows"** to automatically launch Aetheris silently in sleep mode when your PC boots up.

---

## 🛠️ FOR DEVELOPERS (Building & Contributing)

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or higher
- `npm` v9.0 or higher

### Local Development Setup
```bash
# 1. Clone the repository
git clone https://github.com/venkatengineer/music_overlay.git
cd music_overlay

# 2. Install dependencies
npm install

# 3. Launch Vite Dev Server + Live Desktop Electron Overlay
npm run electron
```

### Production Build & Packaging
```bash
# Compile TypeScript and bundle Vite web application
npm run build

# Package standalone Windows NSIS Installer (produces dist-release/Aetheris-Setup-1.0.0.exe)
npm run dist
```

---

## 🔒 Security & Privacy

- **PKCE 2.0 OAuth**: Aetheris uses Spotify's secure Authorization Code Flow with PKCE (Proof Key for Code Exchange).
- **Zero Client Secrets**: No Spotify Client Secrets are embedded or required.
- **Local Token Storage**: Access and refresh tokens are saved locally in your system's secure appData directory (`aetheris_alien_music_overlay_data`).
