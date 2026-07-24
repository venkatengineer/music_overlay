# Aetheris OS: Futuristic Holographic Desktop Music Overlay
## System Architecture & Technical Developer Guide

---

## 1. Executive Summary & Aesthetic Language

**Aetheris OS** is an extraterrestrial holographic HUD desktop music overlay interface designed to simulate an advanced alien operating system. The interface features borderless glassmorphic framing, 3D tilt CD physics, an **Automatic Song Genre-to-Theme Auto-Morphing Engine**, a reactive circular plasma audio visualizer, alien glyph decoded text transitions, search archive, queue management, ambient nebula particles, full Spotify Web API integration, and Windows native desktop overlay execution with system-level global hotkeys (`Ctrl+Space`).

### Core Aesthetic Tokens
- **Themes**: `Alien Green` (#00ffaa), `Deep Space Blue` (#00bfff), `Red Plasma` (#ff0055), `White Hologram` (#ffffff), `Amber Reactor` (#ffaa00).
- **Glassmorphism**: 85-90% backdrop transparency with `blur(16px)` backdrop filters and dynamic energy conduit borders.
- **Micro-animations**: Fluid Framer Motion transforms, 3D mouse tilt tracking, energy ripple click feedback, genre wave morphing, and 144 FPS canvas loops.

---

## 2. Directory Structure

```
d:/music_overlay/
├── index.html                       # HTML entry point with sci-fi Google Fonts
├── package.json                     # Dependencies & scripts
├── vite.config.ts                   # Vite bundler configuration
├── tailwind.config.js               # Theme extensions & custom keyframes
├── postcss.config.js                # PostCSS setup
├── tsconfig.json                    # TypeScript compiler options
├── SYSTEM_ARCHITECTURE.md           # Developer system architecture document
├── electron/
│   ├── main.js                      # Windows desktop overlay launcher & global hotkeys
│   └── preload.js                   # IPC bridge for desktop window controls
└── src/
    ├── main.tsx                     # React root mount
    ├── App.tsx                      # Root component & providers
    ├── index.css                    # Glassmorphism utilities & theme variables
    ├── types/
    │   └── music.ts                 # Type definitions for Track, Album, Theme, AudioMetrics
    ├── services/
    │   ├── spotifyApi.ts            # Spotify PKCE OAuth flow & Web API client
    │   └── genreEngine.ts           # Song genre classification & theme auto-morphing
    ├── context/
    │   ├── AudioEngineContext.tsx   # Web Audio API engine & playback manager
    │   └── ThemeSettingsContext.tsx # Skins, opacity & app preferences
    └── components/
        ├── cd/
        │   └── Holo3DDisc.tsx       # 3D CD, plasma visualizer & progress ring
        ├── effects/
        │   └── NebulaParticlesCanvas.tsx # WebGL/Canvas background star dust & fog
        ├── hud/
        │   ├── HUDContainer.tsx     # Window frame, titlebar & keyboard shortcuts
        │   ├── TrackInfoDisplay.tsx # Glyph decoded text, genre badge & frequency bars
        │   ├── PlaybackControls.tsx # Holographic control buttons & volume popout
        │   ├── AlbumDrawer.tsx      # Slide-out bottom album tracklist archive
        │   ├── GalacticSearch.tsx   # Sci-fi catalog search bar (Ctrl+F)
        │   ├── QueueDrawer.tsx      # Slide-out right panel upcoming queue
        │   └── SettingsModal.tsx    # Themes, sliders & Spotify Client ID modal
        └── docs/
            └── ArchitectureDocsModal.tsx # Interactive in-app documentation viewer
```

---

## 3. Automatic Song Genre-to-Theme Auto-Morphing Engine

The `GenreDetectionEngine` automatically analyzes song title, artist, album, and metadata to classify tracks into 5 core genre categories, dynamically morphing theme colors, visualizer wave geometry, particle speed, and glow multipliers on track change:

| Genre Category | Target Alien Theme | Plasma Wave Geometry | Particle Speed | Glow Multiplier |
| :--- | :--- | :--- | :--- | :--- |
| **Synthwave / Cyberpunk** | `Deep Space Blue` | Multi-harmonic electric cyber waves | 1.6x | 1.5x |
| **Rock / Heavy Metal** | `Red Plasma` | Sharp aggressive jagged spikes | 2.2x | 1.8x |
| **Ambient / Space** | `Alien Green` | Smooth organic sinusoidal waves | 0.6x | 1.0x |
| **Jazz / Acoustic** | `Amber Reactor` | Radial pulsing solar breathing ring | 0.9x | 1.2x |
| **EDM / Pop** | `White Hologram` | High treble multi-ring arcs | 1.4x | 1.4x |

---

## 4. Audio Processing Pipeline

The `AudioEngineContext` handles audio playback via an HTML5 Audio Element connected to a Web Audio API `AudioContext` and `AnalyserNode`:

1. **Analyser Setup**:
   ```typescript
   const analyser = ctx.createAnalyser();
   analyser.fftSize = 256;
   analyser.smoothingTimeConstant = 0.8;
   ```
2. **Real-time Frequency Spectrum Calculation**:
   - **Bass (Bins 0-15)**: `\sum_{i=0}^{15} \text{bin}[i] / 15` — Drives CD plasma ring pulse radius & star speed.
   - **Mid (Bins 16-50)**: Drives plasma arc wave amplitude.
   - **Treble (Bins 51-120)**: Emits sharp plasma micro-spikes.

---

## 5. Native Windows Desktop Overlay & System Global Hotkeys

- **Electron Runtime (`electron/main.js`)**: Configured with `frame: false`, `transparent: true`, `alwaysOnTop: true`, `hasShadow: false`.
- **System-Wide Native Global Shortcut**: Registers `CommandOrControl+Space` using Electron's native `globalShortcut` module. Pressing `Ctrl+Space` toggles overlay visibility system-wide, even when playing full-screen Windows games or working in other desktop applications!
