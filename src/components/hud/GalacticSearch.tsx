import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { SpotifyApiService } from '../../services/spotifyApi';
import { Track } from '../../types/music';
import { Search, Music, X, Disc, Sparkles } from 'lucide-react';

export const GalacticSearch: React.FC = () => {
  const { GALACTIC_TRACKS, playTrack, addToQueue } = useAudioEngine() as any;
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
      // 1. Search Galactic Preset Tracks
      const localMatches = (GALACTIC_TRACKS || []).filter(
        (t: Track) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase()) ||
          t.album.toLowerCase().includes(query.toLowerCase())
      );

      // 2. Search Spotify Web API if authenticated
      let spotifyMatches: Track[] = [];
      if (SpotifyApiService.getStoredAccessToken()) {
        spotifyMatches = await SpotifyApiService.search(query);
      }

      setResults([...localMatches, ...spotifyMatches]);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full px-4 my-2 z-30">
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full alien-glass rounded-full border border-white/10 px-4 py-2 shadow-lg focus-within:border-emerald-400 focus-within:shadow-alien-glow transition-all">
        <Search className="w-4 h-4 text-emerald-400 mr-2 animate-pulse" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Galactic Archive..."
          className="w-full bg-transparent border-none outline-none font-rajdhani text-sm text-slate-100 placeholder-slate-500 tracking-wide"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Animated Search Results Overlay */}
      {isOpen && (query.trim() !== '' || results.length > 0) && (
        <div className="absolute left-4 right-4 bottom-full mb-2 alien-glass rounded-2xl border border-white/10 p-3 shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 pb-2 mb-2 border-b border-white/10 uppercase">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Found {results.length} Archive Records</span>
            </span>
            <button onClick={() => setIsOpen(false)} className="hover:text-white">
              CLOSE (ESC)
            </button>
          </div>

          {isSearching ? (
            <div className="py-6 text-center font-mono text-xs text-emerald-400 animate-pulse">
              DECODING GALACTIC METADATA...
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center font-mono text-xs text-slate-500">
              No matching records found in archive.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 font-rajdhani text-xs cursor-pointer group transition-all"
                  onClick={() => {
                    playTrack(track);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-slate-400">{track.artist} • {track.album}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-400 uppercase">
                      {track.source}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/40"
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
