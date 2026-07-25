import React, { useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';
import { ListMusic, X, Play, Trash2, GripVertical } from 'lucide-react';

export const QueueDrawer: React.FC = () => {
  const { queue, removeFromQueue, clearQueue, playTrack } = useAudioEngine();
  const { themeConfig } = useThemeSettings();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      {/* Floating Toggle Button on HUD right side */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => {
          if ((window as any).electronAPI?.setIgnoreMouseEvents) {
            (window as any).electronAPI.setIgnoreMouseEvents(false);
          }
        }}
        className="fixed top-1/2 right-2 -translate-y-1/2 p-2.5 rounded-l-2xl alien-glass border-l border-t border-b border-white/10 hover:text-white shadow-2xl transition-all duration-300 z-40 hover:scale-105"
        style={{ color: themeConfig.primary }}
        title="Toggle Upcoming Queue"
      >
        <ListMusic className="w-5 h-5 animate-pulse" />
      </button>

      {/* Slide-out Queue Right Panel */}
      {isOpen && (
        <div
          onMouseEnter={() => {
            if ((window as any).electronAPI?.setIgnoreMouseEvents) {
              (window as any).electronAPI.setIgnoreMouseEvents(false);
            }
          }}
          className="fixed top-0 right-0 h-full w-80 alien-glass border-l border-white/10 p-4 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between pb-3 border-b border-white/10 font-orbitron text-xs font-semibold"
            style={{ color: themeConfig.primary }}
          >
            <span className="flex items-center space-x-2">
              <ListMusic className="w-4 h-4" />
              <span>UPCOMING TRANSMISSIONS</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {queue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs text-center space-y-2">
                <ListMusic className="w-8 h-8 opacity-40" />
                <span>Queue is empty. Search tracks to populate upcoming queue.</span>
              </div>
            ) : (
              queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all font-rajdhani text-xs group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 cursor-grab" />
                    <img src={track.coverUrl} alt={track.title} className="w-8 h-8 rounded object-cover" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-200 truncate">
                        {track.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{track.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        playTrack(track);
                        removeFromQueue(idx);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      style={{ color: undefined }}
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-1 rounded text-slate-400 hover:text-red-400"
                      title="Remove from Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {queue.length > 0 && (
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-xs hover:bg-red-500/20 transition-all"
              >
                CLEAR QUEUE
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

