import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Holo3DDisc } from '../cd/Holo3DDisc';
import { TrackInfoDisplay } from './TrackInfoDisplay';
import { PlaybackControls } from './PlaybackControls';
import { LyricsPanel } from './LyricsPanel';
import { GalacticSearch } from './GalacticSearch';
import { CurrentAlbumPanel } from './CurrentAlbumPanel';
import { QueueDrawer } from './QueueDrawer';
import { SettingsModal } from './SettingsModal';
import { ArchitectureDocsModal } from '../docs/ArchitectureDocsModal';
import { Pin, Minus, X, Cpu, Activity, LogIn, CheckCircle2, Maximize2, Monitor, Smartphone } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'desktop' | 'compact'>('desktop');

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
      <div
        onMouseEnter={() => {
          if ((window as any).electronAPI?.setIgnoreMouseEvents) {
            (window as any).electronAPI.setIgnoreMouseEvents(false);
          }
        }}
        onMouseLeave={() => {
          if ((window as any).electronAPI?.setIgnoreMouseEvents) {
            (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
          }
        }}
        className="fixed top-6 right-6 z-50 animate-bounce"
      >
        <button
          onClick={() => setIsVisible(true)}
          className="px-4 py-2.5 rounded-full alien-glass border font-orbitron text-xs flex items-center space-x-2 shadow-alien-glow hover:scale-105 transition-all cursor-pointer"
          style={{
            borderColor: `${themeConfig.primary}80`,
            color: themeConfig.primary,
          }}
        >
          <Cpu className="w-4 h-4 animate-spin" style={{ color: themeConfig.primary }} />
          <span>RESTORE AETHERIS HUD (ALT+M / CTRL+SPACE)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => {
        if ((window as any).electronAPI?.setIgnoreMouseEvents) {
          (window as any).electronAPI.setIgnoreMouseEvents(false);
        }
      }}
      onMouseLeave={() => {
        if ((window as any).electronAPI?.setIgnoreMouseEvents) {
          (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
        }
      }}
      className={`relative rounded-[36px] alien-glass border alien-glow-border shadow-2xl m-auto z-30 transition-all duration-500 animate-in fade-in zoom-in-95 ${
        viewMode === 'desktop'
          ? 'w-full max-w-[1350px] p-6 min-h-[640px] flex flex-col justify-between'
          : 'w-[440px] max-w-[95vw] p-5 space-y-2'
      }`}
    >
      <div
        className="absolute top-0 left-1/4 right-1/4 h-[2px] animate-pulse"
        style={{
          background: `linear-gradient(to right, transparent, ${themeConfig.primary}, transparent)`,
        }}
      />

      {/* Window Header Titlebar */}
      <div className="drag-handle flex items-center justify-between pb-3 mb-2 border-b border-white/10 select-none cursor-move">
        {/* Left Diagnostic & Spotify Auth Quick Action */}
        <div className="flex items-center space-x-3 font-orbitron text-[11px] font-bold tracking-wider" style={{ color: themeConfig.primary }}>
          <Activity className="w-4 h-4 animate-pulse" style={{ color: themeConfig.primary }} />
          <span>AETHERIS OS v2.6.0 - {viewMode === 'desktop' ? 'DESKTOP COMMAND DECK' : 'HUD'}</span>

          {isSpotifyConnected ? (
            <span
              className="flex items-center space-x-1 text-[10px] px-2.5 py-0.5 rounded-full border"
              style={{
                borderColor: `${themeConfig.primary}50`,
                backgroundColor: `${themeConfig.primary}20`,
                color: themeConfig.primary,
              }}
            >
              <CheckCircle2 className="w-3 h-3" style={{ color: themeConfig.primary }} />
              <span>{spotifyUserDisplayName || 'SPOTIFY LINKED'}</span>
            </span>
          ) : (
            <button
              onClick={connectSpotify}
              className="no-drag flex items-center space-x-1 text-[10px] px-2.5 py-0.5 rounded-full border transition-all"
              style={{
                borderColor: `${themeConfig.secondary}50`,
                backgroundColor: `${themeConfig.secondary}20`,
                color: themeConfig.secondary,
              }}
              title="Connect Spotify Account"
            >
              <LogIn className="w-3 h-3" style={{ color: themeConfig.secondary }} />
              <span>CONNECT SPOTIFY</span>
            </button>
          )}
        </div>

        {/* Right Window Action Controls & Desktop/Compact Toggle */}
        <div className="no-drag flex items-center space-x-2">
          {/* Desktop Mode vs Compact Overlay View Switcher */}
          <button
            onClick={() => setViewMode(viewMode === 'desktop' ? 'compact' : 'desktop')}
            className="px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center space-x-1.5 transition-all border"
            style={{
              borderColor: viewMode === 'desktop' ? themeConfig.primary : `${themeConfig.secondary}60`,
              backgroundColor: viewMode === 'desktop' ? `${themeConfig.primary}25` : `${themeConfig.secondary}15`,
              color: viewMode === 'desktop' ? themeConfig.primary : themeConfig.secondary,
              boxShadow: viewMode === 'desktop' ? `0 0 10px ${themeConfig.primary}40` : 'none',
            }}
            title="Toggle between Full Desktop Command Console and Compact Overlay Mode"
          >
            {viewMode === 'desktop' ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>DESKTOP MODE</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>COMPACT HUD</span>
              </>
            )}
          </button>

          <button
            onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
            className={`p-1.5 rounded-full transition-all ${
              settings.alwaysOnTop ? 'text-white' : 'text-slate-500 hover:text-white'
            }`}
            style={{
              backgroundColor: settings.alwaysOnTop ? `${themeConfig.primary}30` : 'transparent',
              color: settings.alwaysOnTop ? themeConfig.primary : undefined,
            }}
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
            className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors"
            title="Toggle Fullscreen Mode (F11)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <ArchitectureDocsModal />
          <SettingsModal />

          <button
            onClick={() => {
              if ((window as any).electronAPI?.closeWindow) {
                (window as any).electronAPI.closeWindow();
              } else {
                setIsVisible(false);
              }
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-yellow-400 transition-colors"
            title="Minimize Overlay to Sleep Mode (Alt+M / ESC)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if ((window as any).electronAPI?.closeWindow) {
                (window as any).electronAPI.closeWindow();
              } else {
                setIsVisible(false);
              }
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-red-400 transition-colors"
            title="Hide Overlay to Sleep Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Layout: First Run Onboarding vs Desktop/Compact Command Deck */}
      {!isSpotifyConnected ? (
        <div className="flex flex-col items-center justify-center text-center p-8 my-auto py-12 space-y-6 animate-in fade-in zoom-in-95">
          <div
            className="p-5 rounded-full border shadow-2xl animate-pulse"
            style={{
              borderColor: themeConfig.primary,
              backgroundColor: `${themeConfig.primary}15`,
              boxShadow: `0 0 30px ${themeConfig.primary}40`,
            }}
          >
            <Cpu className="w-14 h-14 animate-spin" style={{ color: themeConfig.primary }} />
          </div>

          <div className="space-y-2 max-w-md">
            <h2
              className="font-orbitron text-2xl font-extrabold tracking-widest uppercase"
              style={{ color: themeConfig.primary, textShadow: `0 0 16px ${themeConfig.primary}aa` }}
            >
              AETHERIS OS
            </h2>
            <p className="font-orbitron text-xs font-bold tracking-wider text-cyan-400 uppercase">
              CONNECT YOUR MUSIC
            </p>
            <p className="font-rajdhani text-sm text-slate-300 font-semibold leading-relaxed">
              Synchronize your live Spotify stream with extraterrestrial 3D disc physics, reactive plasma visualizers, and genre auto-morphing.
            </p>
          </div>

          <button
            onClick={connectSpotify}
            className="px-8 py-3.5 rounded-full font-orbitron text-xs font-extrabold tracking-widest text-black uppercase transition-all duration-300 hover:scale-105 shadow-2xl flex items-center space-x-3 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${themeConfig.primary}, ${themeConfig.secondary})`,
              boxShadow: `0 0 25px ${themeConfig.primary}`,
            }}
          >
            <LogIn className="w-4 h-4" />
            <span>CONNECT SPOTIFY</span>
          </button>
        </div>
      ) : viewMode === 'desktop' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto py-3">
          {/* Left Column: Visualizer, Song Info & Playback Controls */}
          <div
            className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-black/40 border shadow-2xl h-full space-y-6"
            style={{ borderColor: `${themeConfig.primary}30` }}
          >
            <Holo3DDisc />
            <TrackInfoDisplay />
            <PlaybackControls />
          </div>

          {/* Right Column: Search, Current Album Panel, Live Synchronized Lyrics, Queue */}
          <div className="lg:col-span-7 flex flex-col space-y-4 p-5 rounded-3xl bg-black/40 border border-white/10 shadow-2xl h-full">
            <GalacticSearch />
            <CurrentAlbumPanel />
            <LyricsPanel />
            <QueueDrawer />
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-2">
          <Holo3DDisc />
          <TrackInfoDisplay />
          <PlaybackControls />
          <GalacticSearch />
          <CurrentAlbumPanel />
          <LyricsPanel />
          <QueueDrawer />
        </div>
      )}

      <div
        className="absolute bottom-0 left-1/3 right-1/3 h-[2px] animate-pulse"
        style={{
          background: `linear-gradient(to right, transparent, ${themeConfig.secondary}, transparent)`,
        }}
      />
    </div>
  );
};

