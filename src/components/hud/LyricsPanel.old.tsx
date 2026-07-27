import React, { useEffect, useState, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { LyricsService, FetchLyricsResult } from '../../services/lyricsService';
import { Radio, Sparkles, Music2, Disc, Activity } from 'lucide-react';

export const LyricsPanel: React.FC = () => {
  const { currentTrack, currentTime, duration, seekTo, isOverlayVisible } = useAudioEngine();
  const { themeConfig } = useThemeSettings();

  const [bufferedLyrics, setBufferedLyrics] = useState<FetchLyricsResult>({
    data: null,
    status: 'loading',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTrackKeyRef = useRef<string>('');
  const prevActiveIndexRef = useRef<number>(-1);

  const primaryColor = themeConfig.primary || '#00ffaa';
  const secondaryColor = themeConfig.secondary || '#00e5ff';

  const trackKey = `${currentTrack.id}::${currentTrack.title}::${currentTrack.artist}`;

  // FETCH ONCE -> BUFFER -> LOCAL TIMELINE Lifecycle
  useEffect(() => {
    if (!currentTrack.id || currentTrack.id === 'empty' || !currentTrack.title) {
      setBufferedLyrics({ data: null, status: 'not_found' });
      return;
    }

    if (!isOverlayVisible) {
      return;
    }

    // Check if lyrics are already cached in memory
    const cachedData = LyricsService.getCachedLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration);
    if (cachedData !== undefined) {
      console.log(`[LYRICS CACHE HIT] trackId: ${currentTrack.id}`);
      let cachedStatus: FetchLyricsResult['status'] = 'not_found';
      if (cachedData?.instrumental) cachedStatus = 'instrumental';
      else if (cachedData?.syncedLyrics?.length) cachedStatus = 'synced';
      else if (cachedData?.plainLyrics) cachedStatus = 'plain';

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

    console.log(`[LYRICS FETCH] trackId: ${currentTrack.id}, title: ${currentTrack.title}`);

    LyricsService.fetchLyrics(
      currentTrack.title,
      currentTrack.artist,
      currentTrack.album,
      currentTrack.duration,
      abortController.signal
    ).then((result) => {
      if (isMounted && activeTrackKeyRef.current === trackKey) {
        const lineCount = result.data?.syncedLyrics?.length || 0;
        console.log(`[LYRICS BUFFER CREATED] trackId: ${currentTrack.id}, lineCount: ${lineCount}`);
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

  // LOCAL TIMELINE: Compute progress with +380ms network/hardware latency compensation
  const adjustedProgressMs = Math.round(currentTime * 1000) + 380;
  const syncedLines = bufferedLyrics.data?.syncedLyrics || null;

  // Mode Priority: LINE_SYNC (LRCLIB) -> PLAIN -> INSTRUMENTAL -> NO_LYRICS
  let mode: 'LINE_SYNC' | 'PLAIN' | 'INSTRUMENTAL' | 'NO_LYRICS' = 'NO_LYRICS';
  if (syncedLines && syncedLines.length > 0) {
    mode = 'LINE_SYNC';
  } else if (bufferedLyrics.status === 'plain') {
    mode = 'PLAIN';
  } else if (bufferedLyrics.status === 'instrumental') {
    mode = 'INSTRUMENTAL';
  }

  // Find active line index cleanly from LRCLIB line timestamps
  let activeIndex = -1;
  if (syncedLines && syncedLines.length > 0) {
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].timeMs <= adjustedProgressMs) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  if (prevActiveIndexRef.current !== activeIndex) {
    console.log(`[LYRICS ACTIVE INDEX] old: ${prevActiveIndexRef.current}, new: ${activeIndex}`);
    prevActiveIndexRef.current = activeIndex;
  }

  const handleLyricClick = (lineTimeMs: number) => {
    seekTo(lineTimeMs / 1000);
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Fixed Line Height spacing for stable viewport translateY centering
  const LINE_HEIGHT_PX = 48;
  const activeOffsetPx = Math.max(0, activeIndex) * LINE_HEIGHT_PX;

  return (
    <div className="w-full flex-1 flex flex-col justify-between my-2 p-4 rounded-2xl alien-glass border border-white/10 shadow-2xl transition-colors duration-300 z-20 min-h-[260px]">
      {/* Header Titlebar */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10 font-mono text-xs">
        <div className="flex items-center space-x-2 font-bold tracking-widest uppercase" style={{ color: primaryColor }}>
          <Radio className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
          <span>LYRIC TRANSMISSION</span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2 text-[10px] font-bold tracking-wider">
          {mode === 'LINE_SYNC' && (
            <span
              className="px-2.5 py-0.5 rounded-full border flex items-center space-x-1"
              style={{
                borderColor: `${primaryColor}60`,
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
              }}
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>LINE SYNC // BUFFERED</span>
            </span>
          )}
          {mode === 'PLAIN' && (
            <span className="px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-950/30 text-yellow-400">
              UNSYNCED
            </span>
          )}
          {mode === 'INSTRUMENTAL' && (
            <span className="px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-950/30 text-purple-300 flex items-center space-x-1">
              <Music2 className="w-3 h-3" />
              <span>INSTRUMENTAL SIGNAL</span>
            </span>
          )}
          {mode === 'NO_LYRICS' && bufferedLyrics.status === 'loading' && (
            <span className="px-2.5 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 animate-pulse">
              ACQUIRING TRANSMISSION...
            </span>
          )}
          {mode === 'NO_LYRICS' && bufferedLyrics.status !== 'loading' && (
            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-black/40 text-slate-400">
              NO TRANSMISSION DETECTED
            </span>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex flex-col justify-center overflow-hidden font-rajdhani py-2 h-[150px]">
        {/* Loading State */}
        {bufferedLyrics.status === 'loading' && (
          <div className="py-12 text-center font-mono text-xs animate-pulse space-y-2" style={{ color: primaryColor }}>
            <Radio className="w-6 h-6 mx-auto animate-spin" />
            <p className="tracking-widest uppercase">SCANNING EXTRA-TERRESTRIAL FREQUENCIES FOR LYRICS...</p>
          </div>
        )}

        {/* STABLE FULL LYRICS LIST DOM — Viewport Offset Transform Centering */}
        {mode === 'LINE_SYNC' && syncedLines && (
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            <div
              className="absolute w-full transition-transform duration-300 ease-out flex flex-col items-center select-none"
              style={{
                transform: `translateY(-${activeOffsetPx}px)`,
                top: '50%',
                marginTop: `-${LINE_HEIGHT_PX / 2}px`,
                fontFamily: "'Rajdhani', 'Noto Sans Tamil', 'Mukta', system-ui, sans-serif",
              }}
            >
              {syncedLines.map((line, idx) => {
                const distance = idx - Math.max(0, activeIndex);
                const isActive = distance === 0;
                const isNear = Math.abs(distance) === 1;

                return (
                  <div
                    key={`${currentTrack.id}-${line.timeMs}`}
                    onClick={() => handleLyricClick(line.timeMs)}
                    className="w-full flex items-center justify-center px-4 cursor-pointer transition-opacity duration-200"
                    style={{ height: `${LINE_HEIGHT_PX}px` }}
                  >
                    <p
                      className={`text-center leading-snug truncate max-w-full ${
                        isActive
                          ? 'font-extrabold text-sm md:text-base text-white'
                          : 'font-semibold text-xs md:text-sm text-slate-300'
                      }`}
                      style={{
                        opacity: isActive ? 1 : isNear ? 0.65 : 0.25,
                        textShadow: isActive ? `0 0 16px ${primaryColor}, 0 0 24px ${primaryColor}aa` : 'none',
                      }}
                    >
                      {line.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plain Unsynced Lyrics Mode */}
        {mode === 'PLAIN' && bufferedLyrics.data?.plainLyrics && (
          <div className="max-h-[220px] overflow-y-auto p-3 text-center space-y-1.5 custom-scrollbar text-sm font-semibold text-slate-200 leading-relaxed whitespace-pre-wrap">
            {bufferedLyrics.data.plainLyrics}
          </div>
        )}

        {/* Instrumental Track State */}
        {mode === 'INSTRUMENTAL' && (
          <div className="py-10 text-center space-y-2">
            <Music2 className="w-8 h-8 mx-auto animate-bounce" style={{ color: primaryColor }} />
            <p className="font-orbitron text-xs font-bold tracking-widest text-purple-300 uppercase">
              INSTRUMENTAL COMPOSITION
            </p>
            <p className="font-mono text-[11px] text-slate-400">
              No vocal transmissions detected in this audio stream.
            </p>
          </div>
        )}

        {/* No Lyrics Found State */}
        {mode === 'NO_LYRICS' && bufferedLyrics.status !== 'loading' && (
          <div className="py-10 text-center space-y-2">
            <Disc className="w-8 h-8 mx-auto text-slate-600 animate-spin" style={{ animationDuration: '10s' }} />
            <p className="font-mono text-xs font-semibold text-slate-400 tracking-wider">
              NO SYNCHRONIZED TRANSMISSION FOUND FOR THIS TRACK
            </p>
          </div>
        )}
      </div>

      {/* Futuristic Telemetry Footer Bar */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
        <div className="flex items-center space-x-2">
          <Activity className="w-3 h-3 animate-pulse" style={{ color: primaryColor }} />
          <span>LYRIC SIGNAL: {mode}</span>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-[140px] h-1.5 mx-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
            }}
          />
        </div>

        <span>
          {syncedLines ? `${Math.max(0, activeIndex) + 1}/${syncedLines.length}` : '0/0'}
        </span>
      </div>
    </div>
  );
};
