import React, { useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { Play, ChevronUp, ChevronDown, Clock, FolderGit2 } from 'lucide-react';

export const AlbumDrawer: React.FC = () => {
  const { albums, currentTrack, playTrack, isPlaying } = useAudioEngine();
  const { themeConfig } = useThemeSettings();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(albums[0]?.id || '');

  React.useEffect(() => {
    if (albums.length > 0 && !albums.some((a) => a.id === selectedAlbumId)) {
      setSelectedAlbumId(albums[0].id);
    }
  }, [albums, selectedAlbumId]);

  const activeAlbum = albums.find((a) => a.id === selectedAlbumId) || albums[0];

  return (
    <div className="w-full mt-2 transition-all duration-300 z-20">
      {/* Toggle Drawer Handle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-1.5 px-4 alien-glass border-t border-b border-white/10 flex items-center justify-between font-mono text-xs text-slate-300 hover:text-white transition-colors cursor-pointer group"
      >
        <span className="flex items-center space-x-2">
          <FolderGit2 className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" style={{ color: themeConfig.primary }} />
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
            {albums.map((album) => {
              const isSelected = selectedAlbumId === album.id;
              return (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-semibold transition-all whitespace-nowrap border"
                  style={{
                    borderColor: isSelected ? `${themeConfig.primary}60` : 'rgba(255,255,255,0.08)',
                    backgroundColor: isSelected ? `${themeConfig.primary}20` : 'rgba(0,0,0,0.3)',
                    color: isSelected ? themeConfig.primary : '#94a3b8',
                    boxShadow: isSelected ? `0 0 10px ${themeConfig.primary}40` : 'none',
                  }}
                >
                  <img src={album.coverUrl} alt={album.title} className="w-5 h-5 rounded object-cover" />
                  <span>{album.title}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Album Tracks List */}
          {activeAlbum && (
            <div className="space-y-1">
              {activeAlbum.tracks.map((track, index) => {
                const isActive = currentTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, activeAlbum.id ? (activeAlbum.id.startsWith('spotify:') ? activeAlbum.id : `spotify:album:${activeAlbum.id}`) : undefined)}
                    className="flex items-center justify-between p-2 rounded-lg text-xs font-rajdhani cursor-pointer transition-all duration-200 hover:translate-x-1 border"
                    style={{
                      borderColor: isActive ? `${themeConfig.primary}50` : 'transparent',
                      background: isActive
                        ? `linear-gradient(to right, ${themeConfig.primary}20, ${themeConfig.secondary}10)`
                        : undefined,
                      color: isActive ? themeConfig.primary : undefined,
                    }}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden pr-2">
                      <span className="font-mono text-slate-500 w-4 text-center flex-shrink-0">
                        {isActive && isPlaying ? (
                          <span
                            className="w-2 h-2 rounded-full inline-block animate-ping"
                            style={{ backgroundColor: themeConfig.primary }}
                          />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-bold text-sm text-white truncate" title={track.title}>{track.title}</div>
                        <div className="text-[11px] text-slate-400 truncate" title={track.artist}>{track.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                      <Play
                        className="w-3.5 h-3.5 fill-current"
                        style={{ color: isActive ? themeConfig.primary : '#64748b' }}
                      />
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

