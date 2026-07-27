import React, { useEffect, useState, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { LyricsService, FetchLyricsResult } from '../../services/lyricsService';

const LINE_HEIGHT_PX = 52;

interface LyricsDisplayProps {
  lines: Array<{ timeMs: number; text: string }> | null;
  activeIndex: number;
  mode: 'LINE_SYNC' | 'PLAIN' | 'INSTRUMENTAL' | 'NO_LYRICS';
  status: FetchLyricsResult['status'];
  plainLyrics?: string | null;
  activeLineRef: React.RefObject<HTMLParagraphElement>;
}

// Binary Search for Active Lyric Line
function findActiveLineIndex(lines: Array<{ timeMs: number; text: string }>, targetMs: number): number {
  if (!lines || lines.length === 0) return -1;
  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].timeMs <= targetMs) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

// Memoized LyricsDisplay — renders ONLY when activeIndex, lines, or mode change
const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(
  ({ lines, activeIndex, mode, status, plainLyrics, activeLineRef }) => {
    console.count('[LYRICS DISPLAY RENDER]');

    if (status === 'loading') {
      return (
        <div className="py-12 text-center font-mono text-xs tracking-widest text-white/50 uppercase">
          Scanning Extra-Terrestrial Frequencies For Lyrics...
        </div>
      );
    }

    if (mode === 'LINE_SYNC' && lines && lines.length > 0) {
      const activeOffsetPx = Math.max(0, activeIndex) * LINE_HEIGHT_PX;

      return (
        <div className="relative w-full h-[240px] overflow-hidden flex items-center justify-center select-none">
          <div
            className="absolute w-full flex flex-col items-center select-none"
            style={{
              transform: `translate3d(0, -${activeOffsetPx}px, 0)`,
              transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              top: '50%',
              marginTop: `-${LINE_HEIGHT_PX / 2}px`,
              fontFamily: "'Rajdhani', 'Noto Sans Tamil', 'Mukta', system-ui, sans-serif",
            }}
          >
            {lines.map((line, idx) => {
              const distance = idx - Math.max(0, activeIndex);
              const absDist = Math.abs(distance);
              const isActive = distance === 0;

              // Distance-Based Visual Hierarchy (Requirement 1)
              let opacity = 0.12;
              let scale = 0.92;
              let fontWeight = 400;
              let filter = 'none';

              if (isActive) {
                opacity = 1.0;
                scale = 1.06;
                fontWeight = 800;
              } else if (absDist === 1) {
                opacity = 0.65;
                scale = 0.98;
                fontWeight = 600;
              } else if (absDist === 2) {
                opacity = 0.35;
                scale = 0.94;
                fontWeight = 500;
              } else if (absDist === 3) {
                opacity = 0.18;
                scale = 0.90;
                fontWeight = 400;
                filter = 'blur(0.5px)';
              } else {
                opacity = 0.08;
                scale = 0.86;
                fontWeight = 400;
                filter = 'blur(1.5px)';
              }

              return (
                <div
                  key={`${line.timeMs}-${idx}`}
                  className="w-full flex items-center justify-center px-6"
                  style={{
                    height: `${LINE_HEIGHT_PX}px`,
                    transform: `scale(${scale})`,
                    transition: 'transform 0.4s ease, opacity 0.4s ease, filter 0.4s ease',
                    opacity,
                    filter,
                  }}
                >
                  <p
                    ref={isActive ? activeLineRef : undefined}
                    className="text-center truncate max-w-full tracking-wide"
                    style={{
                      fontWeight,
                      fontSize: isActive ? '18px' : '15px',
                      lineHeight: '1.4',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                      backgroundImage: isActive
                        ? 'linear-gradient(90deg, var(--album-primary, #ffffff) calc(var(--line-progress, 0) * 100%), rgba(255, 255, 255, 0.75) calc(var(--line-progress, 0) * 100% + 20px))'
                        : 'none',
                      WebkitBackgroundClip: isActive ? 'text' : 'unset',
                      WebkitTextFillColor: isActive ? 'transparent' : 'unset',
                      textShadow: isActive ? '0 0 20px var(--album-glow, rgba(0, 255, 170, 0.4))' : 'none',
                    }}
                  >
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (mode === 'PLAIN' && plainLyrics) {
      return (
        <div className="max-h-[220px] overflow-y-auto p-4 text-center text-sm font-medium text-white/90 leading-relaxed whitespace-pre-wrap">
          {plainLyrics}
        </div>
      );
    }

    if (mode === 'INSTRUMENTAL') {
      return (
        <div className="py-12 text-center font-mono text-xs tracking-widest text-purple-300 uppercase">
          Instrumental Track — No Vocal Transmissions
        </div>
      );
    }

    return (
      <div className="py-12 text-center font-mono text-xs tracking-widest text-white/40 uppercase">
        No Lyrics Available
      </div>
    );
  }
);

LyricsDisplay.displayName = 'LyricsDisplay';

export const LyricsPanel: React.FC = () => {
  const { currentTrack, getPlaybackProgressMs, isOverlayVisible } = useAudioEngine();

  const [bufferedLyrics, setBufferedLyrics] = useState<FetchLyricsResult>({
    data: null,
    status: 'loading',
  });

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const activeIndexRef = useRef<number>(-1);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTrackKeyRef = useRef<string>('');

  const trackKey = `${currentTrack.id}::${currentTrack.title}::${currentTrack.artist}`;

  // FETCH ONCE PER TRACK -> BUFFER
  useEffect(() => {
    if (!currentTrack.id || currentTrack.id === 'empty' || !currentTrack.title) {
      setBufferedLyrics({ data: null, status: 'not_found' });
      return;
    }

    if (!isOverlayVisible) {
      return;
    }

    const cachedData = LyricsService.getCachedLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration);
    if (cachedData !== undefined) {
      let cachedStatus: FetchLyricsResult['status'] = 'not_found';
      if (cachedData?.instrumental) cachedStatus = 'instrumental';
      else if (cachedData?.syncedLyrics?.length) cachedStatus = 'synced';
      else if (cachedData?.plainLyrics) cachedStatus = 'plain';

      const lineCount = cachedData?.syncedLyrics?.length || 0;
      console.log(`[LYRICS LOAD] [CACHE HIT] trackId: ${currentTrack.id}, lineCount: ${lineCount}`);
      activeTrackKeyRef.current = trackKey;
      setBufferedLyrics({ data: cachedData, status: cachedStatus });
      return;
    }

    if (activeTrackKeyRef.current !== trackKey) {
      setBufferedLyrics({ data: null, status: 'loading' });
      activeTrackKeyRef.current = trackKey;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let isMounted = true;

    LyricsService.fetchLyrics(
      currentTrack.title,
      currentTrack.artist,
      currentTrack.album,
      currentTrack.duration,
      abortController.signal
    ).then((result) => {
      if (isMounted && activeTrackKeyRef.current === trackKey) {
        const lineCount = result.data?.syncedLyrics?.length || 0;
        console.log(`[LYRICS LOAD] trackId: ${currentTrack.id}, lineCount: ${lineCount}`);
        setBufferedLyrics(result);
      }
    }).catch(() => {
      if (isMounted && activeTrackKeyRef.current === trackKey) {
        setBufferedLyrics({ data: null, status: 'error' });
      }
    });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [trackKey, isOverlayVisible]);

  const syncedLines = bufferedLyrics.data?.syncedLyrics || null;

  let mode: 'LINE_SYNC' | 'PLAIN' | 'INSTRUMENTAL' | 'NO_LYRICS' = 'NO_LYRICS';
  if (syncedLines && syncedLines.length > 0) {
    mode = 'LINE_SYNC';
  } else if (bufferedLyrics.status === 'plain') {
    mode = 'PLAIN';
  } else if (bufferedLyrics.status === 'instrumental') {
    mode = 'INSTRUMENTAL';
  }

  // Active Lyric Index Clock Loop: Queries local clock & binary searches index. Updates state ONLY when index changes (Requirements 7, 8)
  useEffect(() => {
    if (!isOverlayVisible || mode !== 'LINE_SYNC' || !syncedLines || syncedLines.length === 0) {
      return;
    }

    let animFrameId: number;

    const tick = () => {
      const currentMs = getPlaybackProgressMs();
      const adjustedProgressMs = currentMs + 380; // +380ms latency compensation
      const newIndex = findActiveLineIndex(syncedLines, adjustedProgressMs);

      if (newIndex !== activeIndexRef.current) {
        console.log(`[LYRIC INDEX CHANGE] old: ${activeIndexRef.current}, new: ${newIndex}`);
        activeIndexRef.current = newIndex;
        setActiveIndex(newIndex);
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [syncedLines, mode, isOverlayVisible, getPlaybackProgressMs]);

  // Active Line Progress Highlight Loop: Calculates progress (0..1) through current line and updates --line-progress on element ref (Requirement 3)
  useEffect(() => {
    if (!isOverlayVisible || mode !== 'LINE_SYNC' || !syncedLines || syncedLines.length === 0 || activeIndex < 0) {
      return;
    }

    let animFrameId: number;

    const updateLineProgress = () => {
      if (activeLineRef.current && syncedLines[activeIndex]) {
        const currentMs = getPlaybackProgressMs();
        const curLineTime = syncedLines[activeIndex].timeMs;
        const nextLineTime = syncedLines[activeIndex + 1]
          ? syncedLines[activeIndex + 1].timeMs
          : curLineTime + 4000;

        const duration = Math.max(500, nextLineTime - curLineTime);
        const progress = Math.min(1.0, Math.max(0.0, (currentMs - curLineTime) / duration));

        activeLineRef.current.style.setProperty('--line-progress', progress.toFixed(3));
      }
      animFrameId = requestAnimationFrame(updateLineProgress);
    };

    animFrameId = requestAnimationFrame(updateLineProgress);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [syncedLines, activeIndex, mode, isOverlayVisible, getPlaybackProgressMs]);

  return (
    <div
      className="relative w-full flex-1 flex flex-col justify-between my-2 p-4 rounded-2xl border transition-all duration-700 overflow-hidden shadow-2xl min-h-[280px]"
      style={{
        backgroundColor: 'var(--album-bg, #040d12)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Multi-Layer Atmospheric Background (Requirements 9, 10, 11) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-1000">
        {/* Layer 1: Spatial Primary Radial Glow */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at var(--album-primary-x, 25%) var(--album-primary-y, 25%), var(--album-primary, #00ffaa) 0%, transparent 65%)`,
            opacity: 'calc(var(--album-primary-weight, 0.7) * 0.35)',
            filter: 'blur(30px)',
          }}
        />

        {/* Layer 2: Spatial Secondary Radial Glow */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at var(--album-secondary-x, 75%) var(--album-secondary-y, 75%), var(--album-secondary, #00e5ff) 0%, transparent 60%)`,
            opacity: 'calc(var(--album-secondary-weight, 0.3) * 0.35)',
            filter: 'blur(30px)',
          }}
        />

        {/* Layer 3: Central Ambient Atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 80%)',
          }}
        />
      </div>

      {/* Development Debug Swatch Bar (Requirement 17) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="relative z-30 flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono text-white/70">
          <span>ALBUM ATMOSPHERE DEBUGS</span>
          <div className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: 'var(--album-primary)', color: '#000' }}>
              PRIMARY
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: 'var(--album-secondary)', color: '#000' }}>
              SECONDARY
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: 'var(--album-bg)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              BG
            </span>
          </div>
        </div>
      )}

      {/* Header Titlebar */}
      <div className="relative z-10 flex items-center justify-between pb-2.5 mb-1 border-b border-white/10 font-mono text-xs">
        <div className="flex items-center space-x-2 font-bold tracking-widest uppercase text-white/90">
          <span style={{ color: 'var(--album-primary, #00ffaa)' }}>LYRIC TRANSMISSION</span>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10 bg-black/40 text-white/70">
          {mode}
        </span>
      </div>

      {/* Main Viewport Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-center overflow-hidden">
        <LyricsDisplay
          lines={syncedLines}
          activeIndex={activeIndex}
          mode={mode}
          status={bufferedLyrics.status}
          plainLyrics={bufferedLyrics.data?.plainLyrics}
          activeLineRef={activeLineRef}
        />
      </div>
    </div>
  );
};
