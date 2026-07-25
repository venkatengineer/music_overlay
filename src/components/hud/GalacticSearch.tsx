import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import {
  SpotifyApiService,
  OfficialSpotifySearchResult,
  SpotifySearchTrackItem,
  SpotifySearchAlbumItem,
  SpotifySearchArtistItem,
} from '../../services/spotifyApi';
import { Search, X, Sparkles, LogIn, ExternalLink, Music, Disc, User, AlertCircle } from 'lucide-react';

export const GalacticSearch: React.FC = () => {
  const { playTrack, addToQueue, isSpotifyConnected, connectSpotify } = useAudioEngine();
  const { themeConfig } = useThemeSettings();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<OfficialSpotifySearchResult | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Global Keyboard Shortcut: Ctrl+F to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search Execution with 300ms Debounce & Request Cancellation (AbortController)
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults(null);
      setIsSearching(false);
      setErrorMessage(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    // Cancel previous in-flight request if user continues typing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const searchResult = await SpotifyApiService.searchOfficial(trimmed, controller.signal);
        setResults(searchResult);
        setIsSearching(false);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('[SPOTIFY SEARCH ERROR]', err);
        setErrorMessage('Unable to contact Spotify.');
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const handleIconClick = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleTrackClick = (track: SpotifySearchTrackItem) => {
    try {
      playTrack(track);
    } catch (e) {
      if (track.externalUrl) window.open(track.externalUrl, '_blank');
    }
    setIsOpen(false);
  };

  const handleAlbumClick = (album: SpotifySearchAlbumItem) => {
    if (album.externalUrl) {
      window.open(album.externalUrl, '_blank');
    }
  };

  const handleArtistClick = (artist: SpotifySearchArtistItem) => {
    if (artist.externalUrl) {
      window.open(artist.externalUrl, '_blank');
    }
  };

  const hasResults =
    results &&
    (results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0);

  const ensureMouseInteractive = () => {
    if ((window as any).electronAPI?.setIgnoreMouseEvents) {
      (window as any).electronAPI.setIgnoreMouseEvents(false);
    }
  };

  return (
    <div className="relative w-full px-2 my-2 z-30" onMouseEnter={ensureMouseInteractive}>
      {/* Search Input Bar */}
      <div
        onClick={handleIconClick}
        className="relative flex items-center w-full alien-glass rounded-full border border-white/10 px-4 py-2 shadow-lg transition-all cursor-text focus-within:shadow-alien-glow"
        style={{
          borderColor: isOpen ? `${themeConfig.primary}80` : 'rgba(255,255,255,0.1)',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleIconClick();
          }}
          className="p-1 rounded-full transition-colors mr-1 cursor-pointer"
          style={{ color: themeConfig.primary }}
          title="Search the Galactic Archive... (Ctrl+F)"
        >
          <Search className="w-4 h-4 animate-pulse" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            ensureMouseInteractive();
            setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Galactic Archive..."
          className="w-full bg-transparent border-none outline-none font-rajdhani text-sm text-slate-100 placeholder-slate-400 tracking-wide"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              setResults(null);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown Panel (Opens Downward) */}
      {isOpen && (
        <div
          className="absolute left-2 right-2 top-full mt-2 alien-glass rounded-2xl border p-3 shadow-2xl max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 z-50"
          style={{ borderColor: `${themeConfig.primary}50` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 pb-2 mb-2 border-b border-white/10 uppercase">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: themeConfig.primary }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: themeConfig.primary }} />
              <span>Official Spotify Transmissions</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:text-white font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-black/40 border border-white/10"
            >
              CLOSE (ESC)
            </button>
          </div>

          {/* Authentication Banner */}
          {!isSpotifyConnected && (
            <div className="mb-3 p-3 rounded-xl bg-black/70 border flex items-center justify-between font-mono text-xs" style={{ borderColor: `${themeConfig.primary}40` }}>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-slate-300 text-[11px]">Unable to contact Spotify. Connect account to search live catalog:</span>
              </div>
              <button
                onClick={connectSpotify}
                className="px-3 py-1 rounded-lg text-[10px] flex items-center space-x-1 border font-bold transition-all flex-shrink-0 ml-2"
                style={{
                  borderColor: themeConfig.primary,
                  backgroundColor: `${themeConfig.primary}20`,
                  color: themeConfig.primary,
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>CONNECT SPOTIFY</span>
              </button>
            </div>
          )}

          {/* Glowing Loading Animation */}
          {isSearching ? (
            <div
              className="py-8 text-center font-mono text-xs animate-pulse flex flex-col items-center justify-center space-y-2"
              style={{ color: themeConfig.primary }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-1"
                style={{ borderColor: themeConfig.primary, borderTopColor: 'transparent' }}
              />
              <span className="tracking-widest">SCANNING GALACTIC FREQUENCIES...</span>
            </div>
          ) : errorMessage ? (
            <div className="py-6 text-center font-mono text-xs text-rose-400 flex flex-col items-center justify-center space-y-2">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          ) : query.trim() && !hasResults ? (
            <div className="py-8 text-center font-mono text-xs text-slate-400 tracking-wider uppercase">
              No transmissions detected.
            </div>
          ) : results ? (
            <div className="space-y-4">
              {/* SECTION 1: TRACKS */}
              {results.tracks.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    <Music className="w-3.5 h-3.5" style={{ color: themeConfig.primary }} />
                    <span style={{ color: themeConfig.primary }}>Tracks</span>
                  </div>
                  <div className="space-y-1">
                    {results.tracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleTrackClick(track)}
                        className="track-card flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-white/10 font-rajdhani text-xs cursor-pointer group transition-all"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden min-w-0 pr-2">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            loading="lazy"
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                          />
                          <div className="min-w-0 overflow-hidden">
                            <div className="font-bold text-white transition-colors truncate flex items-center space-x-1.5" title={track.title}>
                              <span className="truncate">{track.title}</span>
                              {track.explicit && (
                                <span className="px-1 py-0.2 bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-mono rounded font-bold flex-shrink-0">
                                  E
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate" title={`${track.artist} • ${track.album}`}>
                              {track.artist} • <span className="text-slate-500">{track.album}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="font-mono text-[10px] text-slate-400 mr-1">
                            {formatDuration(track.duration)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue(track);
                            }}
                            className="px-2 py-1 rounded text-[10px] font-mono transition-all border"
                            style={{
                              borderColor: `${themeConfig.primary}40`,
                              backgroundColor: `${themeConfig.primary}20`,
                              color: themeConfig.primary,
                            }}
                          >
                            + QUEUE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: ALBUMS */}
              {results.albums.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider border-t border-white/10 pt-3">
                    <Disc className="w-3.5 h-3.5" style={{ color: themeConfig.secondary }} />
                    <span style={{ color: themeConfig.secondary }}>Albums</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {results.albums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => handleAlbumClick(album)}
                        className="flex items-center space-x-2.5 p-2 rounded-xl border border-transparent hover:border-white/10 bg-black/30 cursor-pointer group transition-all"
                      >
                        <img
                          src={album.coverUrl}
                          alt={album.name}
                          loading="lazy"
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 overflow-hidden">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1 group-hover:text-cyan-300">
                            <span className="truncate">{album.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {album.artist} {album.releaseYear ? `(${album.releaseYear})` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: ARTISTS */}
              {results.artists.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider border-t border-white/10 pt-3">
                    <User className="w-3.5 h-3.5" style={{ color: themeConfig.accent }} />
                    <span style={{ color: themeConfig.accent }}>Artists</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {results.artists.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => handleArtistClick(artist)}
                        className="flex items-center space-x-2.5 p-2 rounded-xl border border-transparent hover:border-white/10 bg-black/30 cursor-pointer group transition-all"
                      >
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          loading="lazy"
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 overflow-hidden">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1 group-hover:text-purple-300">
                            <span className="truncate">{artist.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Artist</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
