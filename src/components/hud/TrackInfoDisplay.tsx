import React, { useEffect, useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Activity, Music, Sparkles } from 'lucide-react';

export const TrackInfoDisplay: React.FC = () => {
  const { currentTrack, currentTime, duration, activeSource, audioMetrics, genreMapping } = useAudioEngine();
  const { themeConfig } = useThemeSettings();

  // Animated Alien Glyph Text Scramble Effect (Original Initial Commit Implementation)
  const [displayTitle, setDisplayTitle] = useState<string>(currentTrack.title);
  const [displayArtist, setDisplayArtist] = useState<string>(currentTrack.artist);

  useEffect(() => {
    const glyphs = '☤☥☧☨☩☫☬☭☯☽☾✙✚✛✜✢✣✤✥✦✧★☆✯▲▼◀▶◆◇';
    let iteration = 0;
    const targetTitle = currentTrack.title || '';

    const interval = setInterval(() => {
      setDisplayTitle(
        targetTitle
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) {
              return char;
            }
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          })
          .join('')
      );

      if (iteration >= targetTitle.length) {
        clearInterval(interval);
      }
      iteration += 0.6;
    }, 35);

    return () => clearInterval(interval);
  }, [currentTrack.id, currentTrack.title]);

  useEffect(() => {
    const glyphs = '☤☥☧☨☩☫☬☭☯☽☾✙✚✛✜✢✣✤✥✦✧★☆✯▲▼◀▶◆◇';
    let iteration = 0;
    const targetArtist = currentTrack.artist || '';

    const interval = setInterval(() => {
      setDisplayArtist(
        targetArtist
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) {
              return char;
            }
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          })
          .join('')
      );

      if (iteration >= targetArtist.length) {
        clearInterval(interval);
      }
      iteration += 0.8;
    }, 35);

    return () => clearInterval(interval);
  }, [currentTrack.id, currentTrack.artist]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-2 px-4 select-none w-full max-w-[360px] overflow-hidden">
      {/* Sci-Fi Diagnostic Badge */}
      <div className="flex items-center justify-center space-x-2 text-[10px] tracking-widest font-mono mb-1 text-slate-400 uppercase w-full">
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full border border-white/10 bg-black/40 flex-shrink-0">
          <Activity className="w-3 h-3 animate-pulse" style={{ color: themeConfig.primary }} />
          <span>LINK: {activeSource.toUpperCase()}</span>
        </span>
        <span
          className="flex items-center space-x-1 px-2 py-0.5 rounded-full border flex-shrink-0"
          style={{
            borderColor: `${themeConfig.primary}50`,
            backgroundColor: `${themeConfig.primary}15`,
            color: themeConfig.primary,
          }}
        >
          <Sparkles className="w-3 h-3" style={{ color: themeConfig.primary }} />
          <span>{genreMapping?.displayName || 'GENRE AUTO-MORPH'}</span>
        </span>
      </div>

      {/* Song Title with Alien Glyph Decoded Text */}
      <div className="w-full overflow-hidden text-center my-0.5 min-h-[32px] flex items-center justify-center">
        <h2
          className="font-orbitron text-xl font-extrabold tracking-wide uppercase drop-shadow-md truncate w-full px-2"
          style={{
            color: themeConfig.primary,
            textShadow: `0 0 14px ${themeConfig.primary}bb`,
          }}
          title={currentTrack.title}
        >
          {displayTitle}
        </h2>
      </div>

      {/* Artist & Album */}
      <div className="flex items-center justify-center space-x-2 font-rajdhani text-sm font-semibold text-slate-300 w-full overflow-hidden px-2">
        <span className="truncate max-w-[150px]" title={currentTrack.artist}>
          {displayArtist}
        </span>
        <span className="text-slate-600 flex-shrink-0">•</span>
        <span className="text-slate-400 font-mono text-xs flex items-center gap-1 truncate max-w-[150px]" title={currentTrack.album}>
          <Music className="w-3 h-3 flex-shrink-0 text-slate-500" />
          <span className="truncate">{currentTrack.album}</span>
        </span>
      </div>

      {/* Real-time Time Counters & Waveform Signal Bars */}
      <div className="flex items-center justify-between w-full max-w-xs mt-3 px-2 font-mono text-xs text-slate-400">
        <span>{formatTime(currentTime)}</span>

        <div className="flex items-end space-x-1 h-4 px-2">
          {Array.from({ length: 12 }).map((_, i) => {
            const val = (audioMetrics.rawFrequencyData[i * 8] || 0) / 255;
            const h = Math.max(1, val * 16);
            return (
              <div
                key={i}
                className="w-1 rounded-t"
                style={{
                  height: `${h}px`,
                  backgroundColor: i % 2 === 0 ? themeConfig.primary : themeConfig.secondary,
                  boxShadow: val > 0.1 ? `0 0 6px ${themeConfig.primary}` : 'none',
                  transition: 'height 80ms ease-out',
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

