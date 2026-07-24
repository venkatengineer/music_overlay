import React, { useEffect, useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Activity, Music, Shield, Sparkles } from 'lucide-react';

export const TrackInfoDisplay: React.FC = () => {
  const { currentTrack, currentTime, duration, activeSource, audioMetrics, genreMapping } = useAudioEngine();
  const { themeConfig } = useThemeSettings();

  // Animated Glyph Text Scramble Effect
  const [displayText, setDisplayText] = useState<string>(currentTrack.title);

  useEffect(() => {
    const glyphs = '☤☥☧☨☩☫☬☭☯☽☾✙✚✛✜✢✣✤✥✦✧★☆✯▲▼◀▶◆◇';
    let iteration = 0;
    const targetText = currentTrack.title;
    
    const interval = setInterval(() => {
      setDisplayText(
        targetText
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return char;
            }
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          })
          .join('')
      );

      if (iteration >= targetText.length) {
        clearInterval(interval);
      }
      iteration += 1 / 2;
    }, 40);

    return () => clearInterval(interval);
  }, [currentTrack.id, currentTrack.title]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-2 px-4 select-none">
      {/* Sci-Fi Diagnostic Badge */}
      <div className="flex items-center space-x-2 text-[10px] tracking-widest font-mono mb-1 text-slate-400 uppercase">
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full border border-white/10 bg-black/40">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>LINK: {activeSource.toUpperCase()}</span>
        </span>
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>{genreMapping?.displayName || 'GENRE AUTO-MORPH'}</span>
        </span>
      </div>

      {/* Song Title with Alien Glyph Decoded Text */}
      <h2
        className="font-orbitron text-2xl font-extrabold tracking-wide uppercase drop-shadow-md truncate max-w-full my-0.5"
        style={{
          color: themeConfig.primary,
          textShadow: `0 0 12px ${themeConfig.primary}aa`,
        }}
      >
        {displayText}
      </h2>

      {/* Artist & Album */}
      <div className="flex items-center space-x-2 font-rajdhani text-sm font-semibold text-slate-300">
        <span>{currentTrack.artist}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400 font-mono text-xs flex items-center gap-1">
          <Music className="w-3 h-3 inline text-slate-500" />
          {currentTrack.album}
        </span>
      </div>

      {/* Real-time Time Counters & Waveform Signal Bars */}
      <div className="flex items-center justify-between w-full max-w-xs mt-3 px-2 font-mono text-xs text-slate-400">
        <span>{formatTime(currentTime)}</span>

        {/* Dynamic Equalizer Micro Bars */}
        <div className="flex items-end space-x-1 h-4 px-2">
          {Array.from({ length: 12 }).map((_, i) => {
            const val = (audioMetrics.rawFrequencyData[i * 8] || 20) / 255;
            const h = Math.max(3, val * 16);
            return (
              <div
                key={i}
                className="w-1 rounded-t transition-all duration-75"
                style={{
                  height: `${h}px`,
                  backgroundColor: i % 2 === 0 ? themeConfig.primary : themeConfig.secondary,
                  boxShadow: `0 0 6px ${themeConfig.primary}`,
                }}
              />
            );
          })}
        </div>

        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
