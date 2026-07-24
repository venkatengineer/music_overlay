import React, { useState } from 'react';
import { useThemeSettings, THEME_CONFIGS } from '../../context/ThemeSettingsContext';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { Settings, X, Sliders, Palette, LogIn, LogOut, Upload, Key, CheckCircle2, ExternalLink, HelpCircle } from 'lucide-react';
import { ThemeId } from '../../types/music';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings } = useThemeSettings();
  const { loadLocalFile, isSpotifyConnected, connectSpotify, disconnectSpotify, spotifyUserDisplayName } = useAudioEngine();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [spotifyIdInput, setSpotifyIdInput] = useState<string>(settings.spotifyClientId || localStorage.getItem('spotify_client_id') || 'b977c4d20ba7494a8dea2a61285e84ce');
  const [redirectUriInput, setRedirectUriInput] = useState<string>(() => {
    const saved = localStorage.getItem('spotify_redirect_uri');
    if (saved) return saved.trim();
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      const origin = window.location.origin;
      return origin.endsWith('/') ? origin : `${origin}/`;
    }
    return 'http://127.0.0.1:3000/';
  });
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const handleSpotifyConnect = () => {
    if (!spotifyIdInput.trim()) {
      alert('Please enter your Spotify Client ID first!');
      return;
    }
    const cleanId = spotifyIdInput.trim();
    const cleanUri = redirectUriInput.trim();
    localStorage.setItem('spotify_client_id', cleanId);
    localStorage.setItem('spotify_redirect_uri', cleanUri);
    updateSettings({ spotifyClientId: cleanId });
    connectSpotify();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadLocalFile(e.target.files[0]);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full alien-glass text-slate-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-400/40 shadow-lg transition-all hover:rotate-90 duration-300"
        title="Alien OS Control Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md alien-glass border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-orbitron text-sm text-emerald-400">
              <span className="flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span>GALACTIC SYSTEM SETTINGS</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Themes */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 font-mono text-xs text-slate-300">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                <span>ALIEN INTERFACE SKINS</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(THEME_CONFIGS).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateSettings({ theme: t.id as ThemeId })}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-rajdhani font-semibold transition-all ${
                      settings.theme === t.id
                        ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-alien-glow'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: t.primary, boxShadow: `0 0 6px ${t.primary}` }}
                    />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Transparency & Glow */}
            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/10">
                <span>GENRE AUTO-MORPH THEMES:</span>
                <button
                  onClick={() => updateSettings({ autoMorphGenreTheme: !settings.autoMorphGenreTheme })}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    settings.autoMorphGenreTheme ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.autoMorphGenreTheme ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>BACKDROP TRANSPARENCY:</span>
                  <span className="text-emerald-400">{Math.round(settings.transparency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="0.98"
                  step="0.01"
                  value={settings.transparency}
                  onChange={(e) => updateSettings({ transparency: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer bg-slate-800 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>HOLOGRAPHIC GLOW INTENSITY:</span>
                  <span className="text-emerald-400">{settings.glowIntensity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={settings.glowIntensity}
                  onChange={(e) => updateSettings({ glowIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer bg-slate-800 rounded"
                />
              </div>
            </div>

            {/* Section 3: Spotify Web API OAuth Configuration */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between font-orbitron text-xs text-emerald-400">
                <span className="flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>SPOTIFY WEB API SETUP</span>
                </span>
                {isSpotifyConnected && (
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>AUTHENTICATED</span>
                  </span>
                )}
              </div>

              {isSpotifyConnected ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-rajdhani">
                    Connected as: <strong className="text-emerald-400">{spotifyUserDisplayName || 'Spotify User'}</strong>
                  </p>
                  <button
                    onClick={disconnectSpotify}
                    className="w-full py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400 text-red-300 font-mono text-xs flex items-center justify-center space-x-2 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>DISCONNECT SPOTIFY ACCOUNT</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 font-rajdhani">
                    Enter your Spotify Client ID & match your Redirect URI.
                  </p>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">SPOTIFY CLIENT ID:</label>
                    <input
                      type="text"
                      placeholder="Paste Spotify Client ID here..."
                      value={spotifyIdInput}
                      onChange={(e) => setSpotifyIdInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/40 font-mono text-xs text-white placeholder-slate-600 focus:border-emerald-400 outline-none mt-0.5"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">SPOTIFY REDIRECT URI:</label>
                    <select
                      value={redirectUriInput}
                      onChange={(e) => setRedirectUriInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/80 border border-emerald-500/40 font-mono text-xs text-emerald-300 focus:border-emerald-400 outline-none mt-0.5"
                    >
                      {typeof window !== 'undefined' && window.location.protocol.startsWith('http') && (
                        <option value={window.location.origin.endsWith('/') ? window.location.origin : `${window.location.origin}/`}>
                          {window.location.origin.endsWith('/') ? window.location.origin : `${window.location.origin}/`} (Active Browser Origin)
                        </option>
                      )}
                      <option value="http://localhost:3000/">http://localhost:3000/</option>
                      <option value="http://localhost:3000">http://localhost:3000</option>
                      <option value="http://127.0.0.1:3000/">http://127.0.0.1:3000/</option>
                      <option value="http://127.0.0.1:3000">http://127.0.0.1:3000</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSpotifyConnect}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 font-mono text-xs flex items-center justify-center space-x-2 transition-all shadow-alien-glow"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>AUTHORIZE SPOTIFY LOGIN</span>
                  </button>

                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-center space-x-1 text-[11px] text-cyan-400 hover:underline pt-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>How to get your free Spotify Client ID?</span>
                  </button>

                  {showGuide && (
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 font-rajdhani text-xs text-slate-300 space-y-1.5 animate-in fade-in">
                      <div className="font-bold text-cyan-300">Quick 3-Step Setup Guide:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                        <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono inline-flex items-center gap-0.5">developer.spotify.com/dashboard <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Click <strong>Create App</strong> (or select an existing App) and click <strong>Edit Settings</strong>.</li>
                        <li>Under <strong>Redirect URIs</strong>, add this EXACT link:
                          <div className="my-1 font-mono text-[11px] text-emerald-300 bg-black/60 p-2 rounded border border-emerald-500/40 select-all font-semibold">
                            {redirectUriInput}
                          </div>
                        </li>
                        <li>Copy your <strong>Client ID</strong>, paste it above, and click <strong>AUTHORIZE SPOTIFY LOGIN</strong>!</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Local Audio Upload */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <span className="font-mono text-xs text-slate-300 flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>PLAY LOCAL AUDIO FILE</span>
              </span>
              <label className="block w-full text-center py-2 px-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs cursor-pointer transition-all">
                <span>SELECT AUDIO FILE (MP3 / WAV / FLAC)</span>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
