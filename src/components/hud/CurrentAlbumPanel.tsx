import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { SpotifyApiService, SpotifyAlbumFull } from '../../services/spotifyApi';
import { Track } from '../../types/music';
import { Disc, Music, Play, Disc3, Sparkles } from 'lucide-react';

export const CurrentAlbumPanel: React.FC = () => {
  const { currentTrack, playTrack, isPlaying } = useAudioEngine();
  const { themeConfig, settings } = useThemeSettings();

  const [albumData, setAlbumData] = useState<SpotifyAlbumFull | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const activeTrackRef = useRef<HTMLDivElement | null>(null);
  const primaryColor = themeConfig.primary || '#10b981';
  const secondaryColor = themeConfig.secondary || '#06b6d4';

  // Determine album ID from currentTrack
  const albumId = currentTrack.spotifyAlbumId || (
    currentTrack.spotifyUri && currentTrack.spotifyUri.includes('album')
      ? currentTrack.spotifyUri.split(':')[2]
      : null
  );

  // Fetch Album Data when currentTrack or albumId changes
  useEffect(() => {
    let isMounted = true;

    if (!albumId) {
      setAlbumData(null);
      return;
    }

    setIsLoading(true);
    SpotifyApiService.getAlbum(albumId).then((fetchedAlbum: SpotifyAlbumFull | null) => {
      if (isMounted) {
        setAlbumData(fetchedAlbum);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [albumId, currentTrack.album]);

  // Auto-scroll so active track stays visible inside track list
  useEffect(() => {
    if (activeTrackRef.current) {
      activeTrackRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTrack.id, albumData]);

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleTrackClick = (track: Track) => {
    playTrack(track, albumData?.spotifyUri || (albumId ? `spotify:album:${albumId}` : undefined));
  };

  // If no Spotify album is loaded, render empty holographic status
  if (!albumData && !isLoading) {
    return null;
  }

  return (
    <div className="w-full my-3 p-4 rounded-2xl alien-glass border border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-top-2">
      {/* Section Title */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
        <span
          className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          style={{ color: primaryColor }}
        >
          <Sparkles className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
          <span>NOW PLAYING ALBUM</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {albumData?.totalTracks || 0} TRACKS
        </span>
      </div>

      {isLoading ? (
        <div className="py-6 text-center font-mono text-xs animate-pulse flex items-center justify-center space-x-2" style={{ color: primaryColor }}>
          <Disc3 className="w-4 h-4 animate-spin" />
          <span>ACCESSING GALACTIC ALBUM ARCHIVE...</span>
        </div>
      ) : albumData ? (
        <div className="space-y-4">
          {/* Top Fixed Header: Album Artwork & Meta Info */}
          <div className="flex items-center space-x-4 p-3 rounded-xl bg-black/40 border border-white/10">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border shadow-lg group" style={{ borderColor: `${primaryColor}40` }}>
              <img
                src={albumData.coverUrl}
                alt={albumData.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-orbitron font-extrabold text-sm text-white truncate flex items-center gap-1.5">
                <span className="text-emerald-400">🟢</span>
                <span className="truncate">{albumData.name}</span>
              </h3>
              <p className="font-rajdhani text-xs text-slate-300 font-semibold truncate mt-0.5">
                {albumData.artist}
              </p>
              <div className="flex items-center space-x-3 font-mono text-[10px] text-slate-400 mt-1.5">
                {albumData.releaseYear && (
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {albumData.releaseYear}
                  </span>
                )}
                <span>{albumData.totalTracks} Tracks</span>
              </div>
            </div>
          </div>

          {/* Independently Scrollable Track List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {albumData.tracks.map((track: Track, idx: number) => {
              const isCurrent =
                currentTrack.id === track.id ||
                currentTrack.title.toLowerCase() === track.title.toLowerCase() ||
                (currentTrack.spotifyUri && currentTrack.spotifyUri === track.spotifyUri);

              return (
                <div
                  key={track.id || idx}
                  ref={isCurrent ? activeTrackRef : null}
                  onClick={() => handleTrackClick(track)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border font-rajdhani text-xs cursor-pointer transition-all duration-200 group ${
                    isCurrent
                      ? 'border-emerald-500/80 bg-emerald-950/40 text-white shadow-lg'
                      : 'border-transparent hover:border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                  style={{
                    boxShadow: isCurrent ? `0 0 12px ${primaryColor}40` : 'none',
                  }}
                >
                  <div className="flex items-center space-x-3 overflow-hidden min-w-0 pr-2">
                    <span className="font-mono text-[11px] w-5 text-center flex-shrink-0" style={{ color: isCurrent ? primaryColor : '#64748b' }}>
                      {isCurrent ? (
                        <span className="text-emerald-400 animate-pulse">🟢</span>
                      ) : (
                        `${idx + 1}.`
                      )}
                    </span>
                    <span className="font-semibold truncate group-hover:text-white transition-colors">
                      {track.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 font-mono text-[10px] text-slate-400">
                    <span>{formatDuration(track.duration)}</span>
                    <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: primaryColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
