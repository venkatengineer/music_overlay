import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Holo3DDisc } from '../cd/Holo3DDisc';
import { TrackInfoDisplay } from './TrackInfoDisplay';
import { PlaybackControls } from './PlaybackControls';
import { AlbumDrawer } from './AlbumDrawer';
import { GalacticSearch } from './GalacticSearch';
import { QueueDrawer } from './QueueDrawer';
import { SettingsModal } from './SettingsModal';
import { ArchitectureDocsModal } from '../docs/ArchitectureDocsModal';
import { Pin, Minus, X, Cpu, Activity, LogIn, CheckCircle2, Maximize2 } from 'lucide-react';

export const HUDContainer: React.FC = () => {
  const {
    togglePlayPause,
    nextTrack,
    previousTrack,
    isSpotifyConnected,
    connectSpotify,
    spotifyUserDisplayName,
  } = useAudioEngine();
  const { settings, updateSettings, themeConfig } = useThemeSettings();

  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Alt+M or Ctrl+Space: Toggle HUD Overlay
      if ((e.altKey && e.key.toLowerCase() === 'm') || ((e.ctrlKey || e.metaKey) && e.code === 'Space')) {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
      else if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousTrack();
      }
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextTrack();
      }
      else if (e.code === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, nextTrack, previousTrack]);

  if (!isVisible) {
    return (
      <div className="fixed top-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => setIsVisible(true)}
          className="px-4 py-2 rounded-full alien-glass border border-emerald-400/50 text-emerald-400 font-orbitron text-xs flex items-center space-x-2 shadow-alien-glow hover:scale-105 transition-all"
        >
          <Cpu className="w-4 h-4 animate-spin" />
          <span>RESTORE AETHERIS HUD (ALT+M / CTRL+SPACE)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-[440px] max-w-[95vw] rounded-[38px] alien-glass border alien-glow-border shadow-2xl p-5 m-auto z-30 transition-all duration-300 animate-in fade-in zoom-in-95">
      <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

      {/* Window Header Titlebar */}
      <div className="drag-handle flex items-center justify-between pb-3 mb-2 border-b border-white/10 select-none cursor-move">
        {/* Left Diagnostic & Spotify Auth Quick Action */}
        <div className="flex items-center space-x-2 font-orbitron text-[11px] font-bold text-emerald-400 tracking-wider">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>AETHERIS HUD</span>

          {isSpotifyConnected ? (
            <span className="flex items-center space-x-1 text-[10px] text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{spotifyUserDisplayName || 'SPOTIFY LINKED'}</span>
            </span>
          ) : (
            <button
              onClick={connectSpotify}
              className="no-drag flex items-center space-x-1 text-[10px] text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
              title="Connect Spotify Account"
            >
              <LogIn className="w-3 h-3 text-cyan-400" />
              <span>CONNECT SPOTIFY</span>
            </button>
          )}
        </div>

        {/* Right Window Action Controls */}
        <div className="no-drag flex items-center space-x-1.5">
          <button
            onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
            className={`p-1.5 rounded-full transition-all ${
              settings.alwaysOnTop ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-500 hover:text-white'
            }`}
            title={settings.alwaysOnTop ? 'Always On Top: ON' : 'Always On Top: OFF'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={() => {
              if ((window as any).electronAPI?.toggleFullscreen) {
                (window as any).electronAPI.toggleFullscreen();
              }
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
            title="Toggle Fullscreen Mode (F11)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <ArchitectureDocsModal />
          <SettingsModal />

          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-yellow-400 transition-colors"
            title="Minimize Overlay (Alt+M / ESC)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-red-400 transition-colors"
            title="Close Overlay"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <Holo3DDisc />
      <TrackInfoDisplay />
      <PlaybackControls />
      <AlbumDrawer />
      <GalacticSearch />
      <QueueDrawer />

      <div className="absolute bottom-0 left-1/3 right-1/3 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
    </div>
  );
};
