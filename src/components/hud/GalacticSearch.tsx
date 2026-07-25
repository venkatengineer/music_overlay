import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine, GALACTIC_TRACKS } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { SpotifyApiService } from '../../services/spotifyApi';
import { Track } from '../../types/music';
import { Search, X, Sparkles, LogIn } from 'lucide-react';

export const GalacticSearch: React.FC = () => {
  const { playTrack, addToQueue, isSpotifyConnected, connectSpotify, albums } = useAudioEngine();
  const { themeConfig } = useThemeSettings();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Track[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global Keyboard Shortcut: Ctrl+F to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search execution
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const q = query.toLowerCase().trim();

      let spotifyMatches: Track[] = [];
      try {
        const validToken = await SpotifyApiService.getValidAccessToken();
        if (validToken) {
          spotifyMatches = await SpotifyApiService.search(query);
        }
      } catch (e) {
        console.warn('Spotify search error:', e);
      }

      // Collect all tracks from loaded Spotify playlists and archive albums
      const allAlbumTracks = (albums || []).flatMap((a) => a.tracks || []);
      const allLocalCandidateTracks = [...allAlbumTracks, ...(GALACTIC_TRACKS || [])];

      const localMatches = allLocalCandidateTracks.filter(
        (t: Track) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );

      // Deduplicate tracks by id or title + artist
      const combined = [...spotifyMatches, ...localMatches];
      const seen = new Set();
      const unique = combined.filter((t) => {
        const key = t.id || `${t.title.toLowerCase()}-${t.artist.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setResults(unique);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, albums]);

  const handleIconClick = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const displayList = query.trim() ? results : GALACTIC_TRACKS;

  return (
    <div className="relative w-full px-2 my-2 z-30">
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
          title="Click to search songs on Spotify & Galactic Archive (Ctrl+F)"
        >
          <Search className="w-4 h-4 animate-pulse" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Spotify & Galactic Archive... (Ctrl+F)"
          className="w-full bg-transparent border-none outline-none font-rajdhani text-sm text-slate-100 placeholder-slate-400 tracking-wide"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              setResults([]);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Animated Search Results Overlay (Opens Downward Below Search Bar) */}
      {isOpen && (
        <div
          className="absolute left-2 right-2 top-full mt-2 alien-glass rounded-2xl border p-3 shadow-2xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 z-50"
          style={{ borderColor: `${themeConfig.primary}50` }}
        >
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 pb-2 mb-2 border-b border-white/10 uppercase">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: themeConfig.primary }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: themeConfig.primary }} />
              <span>{query.trim() ? `Found ${results.length} Results` : 'Spotify & Archive Preset Tracks'}</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:text-white font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-black/40 border border-white/10"
            >
              CLOSE (ESC)
            </button>
          </div>

          {!isSpotifyConnected && (
            <div className="mb-2 p-2.5 rounded-xl bg-black/60 border flex items-center justify-between font-mono text-xs" style={{ borderColor: `${themeConfig.primary}40` }}>
              <span className="text-slate-300 text-[11px]">Connect Spotify to search millions of songs:</span>
              <button
                onClick={connectSpotify}
                className="px-2.5 py-1 rounded-lg text-[10px] flex items-center space-x-1 border font-bold transition-all"
                style={{
                  borderColor: themeConfig.primary,
                  backgroundColor: `${themeConfig.primary}20`,
                  color: themeConfig.primary,
                }}
              >
                <LogIn className="w-3 h-3" />
                <span>CONNECT SPOTIFY</span>
              </button>
            </div>
          )}

          {isSearching ? (
            <div
              className="py-6 text-center font-mono text-xs animate-pulse flex items-center justify-center space-x-2"
              style={{ color: themeConfig.primary }}
            >
              <Sparkles className="w-4 h-4 animate-spin" style={{ color: themeConfig.primary }} />
              <span>SEARCHING LIVE SPOTIFY CATALOG...</span>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="py-6 text-center font-mono text-xs text-slate-400">
              No matching tracks found for "{query}". Connect Spotify to search live catalog.
            </div>
          ) : (
            <div className="space-y-1">
              {displayList.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-white/10 font-rajdhani text-xs cursor-pointer group transition-all"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                  onClick={() => {
                    playTrack(track);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-3 overflow-hidden min-w-0 pr-2">
                    <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0 overflow-hidden">
                      <div className="font-bold text-white transition-colors truncate" title={track.title}>
                        {track.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate" title={`${track.artist} • ${track.album}`}>
                        {track.artist} • <span className="text-slate-500">{track.album}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-black/40 text-slate-400 uppercase border border-white/10">
                      {track.source}
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
          )}
        </div>
      )}
    </div>
  );
};

