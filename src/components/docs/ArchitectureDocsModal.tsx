import React, { useState } from 'react';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { BookOpen, X, Code, Cpu, Activity, Waves, Layers } from 'lucide-react';

export const ArchitectureDocsModal: React.FC = () => {
  const { themeConfig } = useThemeSettings();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full alien-glass text-slate-300 border border-white/10 shadow-lg transition-all"
        style={{ color: themeConfig.secondary }}
        title="View System Architecture Documentation"
      >
        <BookOpen className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          onMouseEnter={() => {
            if ((window as any).electronAPI?.setIgnoreMouseEvents) {
              (window as any).electronAPI.setIgnoreMouseEvents(false);
            }
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-2xl alien-glass border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-slate-200"
            style={{ borderColor: `${themeConfig.secondary}50` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between pb-3 border-b border-white/10 font-orbitron text-sm font-bold"
              style={{ color: themeConfig.secondary }}
            >
              <span className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>AETHERIS OS - SYSTEM ARCHITECTURE DOCS</span>
              </span>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture Overview */}
            <div className="space-y-4 font-rajdhani text-sm">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <h3 className="font-orbitron text-xs flex items-center gap-1.5" style={{ color: themeConfig.primary }}>
                  <Layers className="w-4 h-4" />
                  1. ARCHITECTURAL OVERVIEW
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Aetheris OS is built as a borderless desktop music overlay application using React 18, TypeScript, Vite, TailwindCSS, and HTML5 WebGL/Canvas 2D engines. It features low-latency Web Audio API spectrum analysis, PKCE-authenticated Spotify Web API integration, and smooth 144 FPS animation frame loops.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <h3 className="font-orbitron text-xs flex items-center gap-1.5" style={{ color: themeConfig.secondary }}>
                  <Waves className="w-4 h-4" />
                  2. AUDIO PIPELINE & FREQUENCY SPECTRUM ANALYZER
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  The <code className="font-mono" style={{ color: themeConfig.primary }}>AudioEngineContext</code> instantiates a Web Audio <code className="font-mono" style={{ color: themeConfig.primary }}>AudioContext</code> connected to an <code className="font-mono" style={{ color: themeConfig.primary }}>AnalyserNode</code> (FFT size 256). In real-time, frequency bins are categorized into:
                </p>
                <ul className="list-disc list-inside font-mono text-[11px] text-slate-400 space-y-1 pt-1">
                  <li><strong>Bass (Bins 0-15):</strong> Drives circular plasma visualizer expansion & star pulse.</li>
                  <li><strong>Mid (Bins 16-50):</strong> Drives organic wave height modulation.</li>
                  <li><strong>Treble (Bins 51-120):</strong> Emits sharp plasma micro-spikes.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <h3 className="font-orbitron text-xs flex items-center gap-1.5" style={{ color: themeConfig.accent }}>
                  <Cpu className="w-4 h-4" />
                  3. 3D CD DISC & PLASMA SHADER MATH
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <code className="font-mono" style={{ color: themeConfig.secondary }}>Holo3DDisc.tsx</code> combines 3D CSS perspective matrix transforms for mouse tilt physics with dual Canvas 2D frame loops:
                </p>
                <ul className="list-disc list-inside font-mono text-[11px] text-slate-400 space-y-1 pt-1">
                  <li>Continuous variable velocity rotation (slowed down when paused, speed surge on skip).</li>
                  <li>Circular progress ring arc calculated via <code className="font-mono">2 * Math.PI * Radius * progress</code>.</li>
                  <li>Diffraction iridescence layer styled with radial conic color dodge gradients.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                <h3 className="font-orbitron text-xs flex items-center gap-1.5" style={{ color: themeConfig.primary }}>
                  <Activity className="w-4 h-4" />
                  4. SPOTIFY PKCE OAUTH & FALLBACK AUDIO
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <code className="font-mono" style={{ color: themeConfig.primary }}>SpotifyApiService.ts</code> handles client-side OAuth 2.0 PKCE challenge generation without needing a secret server. When Spotify is inactive, the built-in Galactic Synth Engine generates synthetic ambient sub-bass drones and pulse modulators so visualizers remain dynamic.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1 font-mono text-xs">
                <h3 className="font-orbitron text-xs text-slate-200">5. TAURI / ELECTRON DESKTOP INTEGRATION</h3>
                <p className="text-slate-400 text-[11px]">
                  Configured with borderless window rules, always-on-top flags, glassmorphism transparency, and custom window drag regions (<code style={{ color: themeConfig.primary }}>-webkit-app-region: drag</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

