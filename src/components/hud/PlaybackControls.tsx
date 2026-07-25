import React, { useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const PlaybackControls: React.FC = () => {
  const {
    isPlaying,
    togglePlayPause,
    nextTrack,
    previousTrack,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
  } = useAudioEngine();

  const { themeConfig, settings } = useThemeSettings();
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Energy Ripple Click Trigger
  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x, y };

    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <div className="relative flex items-center justify-center space-x-4 my-3 py-2 px-6 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl z-20">
      {/* Shuffle Button */}
      <button
        onClick={(e) => {
          triggerRipple(e);
          toggleShuffle();
        }}
        className="relative p-2.5 rounded-full transition-all duration-200 hover:-translate-y-1 border"
        style={{
          borderColor: isShuffle ? `${themeConfig.primary}60` : 'transparent',
          backgroundColor: isShuffle ? `${themeConfig.primary}20` : 'transparent',
          color: isShuffle ? themeConfig.primary : '#94a3b8',
          boxShadow: isShuffle ? `0 0 12px ${themeConfig.primary}50` : 'none',
        }}
        title="Shuffle Tracks"
      >
        <Shuffle className="w-4 h-4" />
      </button>

      {/* Previous Track */}
      <button
        onClick={(e) => {
          triggerRipple(e);
          previousTrack();
        }}
        className="relative p-3 rounded-full text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-700/50 border border-white/10 transition-all duration-200 hover:-translate-y-1"
        title="Previous Track (Left Arrow)"
      >
        <SkipBack className="w-5 h-5 fill-current" />
      </button>

      {/* Main Core Play / Pause Button */}
      <button
        onClick={(e) => {
          triggerRipple(e);
          togglePlayPause();
        }}
        className="relative p-5 rounded-full text-black font-extrabold transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${themeConfig.primary}, ${themeConfig.secondary})`,
          boxShadow: `0 0 ${25 * settings.glowIntensity}px ${themeConfig.primary}, inset 0 0 10px rgba(255,255,255,0.6)`,
        }}
        title="Play / Pause (Space)"
      >
        {/* Pulsing Core Overlay */}
        <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse pointer-events-none" />
        
        {isPlaying ? (
          <Pause className="w-7 h-7 fill-current relative z-10" />
        ) : (
          <Play className="w-7 h-7 fill-current relative z-10 translate-x-0.5" />
        )}
      </button>

      {/* Next Track */}
      <button
        onClick={(e) => {
          triggerRipple(e);
          nextTrack();
        }}
        className="relative p-3 rounded-full text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-700/50 border border-white/10 transition-all duration-200 hover:-translate-y-1"
        title="Next Track (Right Arrow)"
      >
        <SkipForward className="w-5 h-5 fill-current" />
      </button>

      {/* Repeat Button */}
      <button
        onClick={(e) => {
          triggerRipple(e);
          toggleRepeat();
        }}
        className="relative p-2.5 rounded-full transition-all duration-200 hover:-translate-y-1 border"
        style={{
          borderColor: isRepeat ? `${themeConfig.primary}60` : 'transparent',
          backgroundColor: isRepeat ? `${themeConfig.primary}20` : 'transparent',
          color: isRepeat ? themeConfig.primary : '#94a3b8',
          boxShadow: isRepeat ? `0 0 12px ${themeConfig.primary}50` : 'none',
        }}
        title="Repeat Track"
      >
        <Repeat className="w-4 h-4" />
      </button>

      {/* Volume Hover Slider Control */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          onClick={toggleMute}
          className="p-2.5 rounded-full text-slate-400 hover:text-white transition-all duration-200 hover:-translate-y-1"
          title="Mute / Unmute"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Floating Radial Volume Slider Popup */}
        {showVolumeSlider && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl alien-glass border border-white/10 shadow-2xl flex flex-col items-center z-50 animate-in fade-in slide-in-from-bottom-2">
            <span className="font-mono text-[10px] text-slate-300 mb-2">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="h-24 w-2 cursor-pointer appearance-none bg-slate-800 rounded-lg"
              style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: themeConfig.primary }}
            />
          </div>
        )}
      </div>

      {/* Click Energy Ripple Canvas Overlay */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute pointer-events-none rounded-full animate-ping"
          style={{
            left: r.x - 10,
            top: r.y - 10,
            width: 20,
            height: 20,
            backgroundColor: `${themeConfig.primary}60`,
          }}
        />
      ))}
    </div>
  );
};

