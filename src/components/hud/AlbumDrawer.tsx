import React, { useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Play, ChevronUp, ChevronDown, Music, Clock, FolderGit2 } from 'lucide-react';

export const AlbumDrawer: React.FC = () => {
  const { albums, currentTrack, playTrack, isPlaying } = useAudioEngine();
  const { themeConfig } = useThemeSettings();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(albums[0]?.id || '');

  const activeAlbum = albums.find((a) => a.id === selectedAlbumId) || albums[0];

  return (
    <div className="w-full mt-2 transition-all duration-300 z-20">
      {/* Toggle Drawer Handle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-1.5 px-4 alien-glass border-t border-b border-white/10 flex items-center justify-between font-mono text-xs text-slate-300 hover:text-white transition-colors cursor-pointer group"
      >
        <span className="flex items-center space-x-2">
          <FolderGit2 className="w-4 h-4 text-emerald-400 group-hover:rotate-180 transition-transform duration-500" />
          <span className="tracking-widest uppercase">Galactic Archive Albums</span>
        </span>
        <span className="flex items-center space-x-1 text-slate-400">
          <span>{isOpen ? 'COLLAPSE' : 'EXPAND ARCHIVE'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </span>
      </button>

      {/* Slide-out Drawer Content */}
      {isOpen && (
        <div className="alien-glass p-4 border-b border-white/10 animate-in slide-in-from-bottom-3 duration-300 max-h-64 overflow-y-auto">
          {/* Album Tabs Header */}
          <div className="flex items-center space-x-3 pb-3 mb-3 border-b border-white/10 overflow-x-auto">
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => setSelectedAlbumId(album.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-semibold transition-all whitespace-nowrap ${
                  selectedAlbumId === album.id
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-alien-glow'
                    : 'bg-black/30 border border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <img src={album.coverUrl} alt={album.title} className="w-5 h-5 rounded object-cover" />
                <span>{album.title}</span>
              </button>
            ))}
          </div>

          {/* Selected Album Tracks List */}
          {activeAlbum && (
            <div className="space-y-1">
              {activeAlbum.tracks.map((track, index) => {
                const isActive = currentTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-rajdhani cursor-pointer transition-all duration-200 hover:translate-x-1 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 text-emerald-300 shadow-sm'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-500 w-4 text-center">
                        {isActive && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{track.title}</div>
                        <div className="text-[11px] text-slate-400">{track.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                      <Play className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400 fill-current' : 'text-slate-500 hover:text-white'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
