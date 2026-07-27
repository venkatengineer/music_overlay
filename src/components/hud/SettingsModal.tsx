import React, { useState } from 'react';
import { useThemeSettings, THEME_CONFIGS } from '../../context/ThemeSettingsContext';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { Settings, X, Sliders, Palette, LogIn, LogOut, Upload, Key, CheckCircle2, ExternalLink, HelpCircle } from 'lucide-react';
import { ThemeId } from '../../types/music';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, themeConfig } = useThemeSettings();
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
  const [autoStartEnabled, setAutoStartEnabled] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && (window as any).electronAPI?.getAutoStart) {
      (window as any).electronAPI.getAutoStart().then((enabled: boolean) => {
        setAutoStartEnabled(enabled);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleAutoStartToggle = async () => {
    if ((window as any).electronAPI?.setAutoStart) {
      const nextState = !autoStartEnabled;
      const res = await (window as any).electronAPI.setAutoStart(nextState);
      setAutoStartEnabled(res);
    }
  };

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
        className="p-2 rounded-full alien-glass text-slate-300 border border-white/10 shadow-lg transition-all hover:rotate-90 duration-300"
        style={{ color: themeConfig.primary }}
        title="Alien OS Control Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          onMouseEnter={() => {
            if ((window as any).electronAPI?.setIgnoreMouseEvents) {
              (window as any).electronAPI.setIgnoreMouseEvents(false);
            }
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-md alien-glass border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
            style={{ borderColor: `${themeConfig.primary}50` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between pb-3 border-b border-white/10 font-orbitron text-sm font-bold"
              style={{ color: themeConfig.primary }}
            >
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
              <label className="flex items-center justify-between font-mono text-xs text-slate-300">
                <span className="flex items-center space-x-2">
                  <Palette className="w-3.5 h-3.5" style={{ color: themeConfig.primary }} />
                  <span>HUD COLOR INTERFACE SKINS</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold tracking-wider">16.7M DYNAMIC RGB READY</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(THEME_CONFIGS).map((t) => {
                  const isSelected = settings.theme === t.id;
                  const isDynamic = t.id === 'dynamic-rgb';
                  return (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ theme: t.id as ThemeId })}
                      className="flex items-center space-x-2 p-2 rounded-xl border text-xs font-rajdhani font-semibold transition-all relative overflow-hidden group"
                      style={{
                        borderColor: isSelected ? (isDynamic ? '#00ffaa' : t.primary) : 'rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? (isDynamic ? 'rgba(0, 255, 170, 0.15)' : `${t.primary}25`) : 'rgba(0,0,0,0.3)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        boxShadow: isSelected ? `0 0 12px ${isDynamic ? '#00ffaa' : t.primary}50` : 'none',
                      }}
                    >
                      {isDynamic ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 via-cyan-400 to-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                      ) : (
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.primary, boxShadow: `0 0 6px ${t.primary}` }}
                        />
                      )}
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Transparency & Glow */}
            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/10">
                <span>START AETHERIS WITH WINDOWS:</span>
                <button
                  onClick={handleAutoStartToggle}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: autoStartEnabled ? `${themeConfig.primary}25` : 'rgba(30,41,59,0.8)',
                    borderColor: autoStartEnabled ? themeConfig.primary : 'transparent',
                    color: autoStartEnabled ? themeConfig.primary : '#94a3b8',
                  }}
                >
                  {autoStartEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/10">
                <span>GENRE AUTO-MORPH THEMES:</span>
                <button
                  onClick={() => updateSettings({ autoMorphGenreTheme: !settings.autoMorphGenreTheme })}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: settings.autoMorphGenreTheme ? `${themeConfig.primary}25` : 'rgba(30,41,59,0.8)',
                    borderColor: settings.autoMorphGenreTheme ? themeConfig.primary : 'transparent',
                    color: settings.autoMorphGenreTheme ? themeConfig.primary : '#94a3b8',
                  }}
                >
                  {settings.autoMorphGenreTheme ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>BACKDROP TRANSPARENCY:</span>
                  <span style={{ color: themeConfig.primary }}>{Math.round(settings.transparency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="0.98"
                  step="0.01"
                  value={settings.transparency}
                  onChange={(e) => updateSettings({ transparency: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer bg-slate-800 rounded"
                  style={{ accentColor: themeConfig.primary }}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>HOLOGRAPHIC GLOW INTENSITY:</span>
                  <span style={{ color: themeConfig.secondary }}>{settings.glowIntensity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={settings.glowIntensity}
                  onChange={(e) => updateSettings({ glowIntensity: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer bg-slate-800 rounded"
                  style={{ accentColor: themeConfig.secondary }}
                />
              </div>
            </div>

            {/* Section 3: Spotify Web API OAuth Configuration */}
            <div
              className="p-3.5 rounded-2xl bg-black/40 border space-y-2.5"
              style={{ borderColor: `${themeConfig.primary}40` }}
            >
              <div className="flex items-center justify-between font-orbitron text-xs font-semibold" style={{ color: themeConfig.primary }}>
                <span className="flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>SPOTIFY WEB API SETUP</span>
                </span>
                {isSpotifyConnected && (
                  <span className="flex items-center space-x-1 text-[10px]" style={{ color: themeConfig.primary }}>
                    <CheckCircle2 className="w-3 h-3" style={{ color: themeConfig.primary }} />
                    <span>AUTHENTICATED</span>
                  </span>
                )}
              </div>

              {isSpotifyConnected ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 font-rajdhani">
                    Connected as: <strong style={{ color: themeConfig.primary }}>{spotifyUserDisplayName || 'Spotify User'}</strong>
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
                      className="w-full px-3 py-1.5 rounded-xl bg-black/60 border font-mono text-xs text-white placeholder-slate-600 outline-none mt-0.5"
                      style={{ borderColor: `${themeConfig.primary}40` }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">SPOTIFY REDIRECT URI:</label>
                    <select
                      value={redirectUriInput}
                      onChange={(e) => setRedirectUriInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/80 border font-mono text-xs outline-none mt-0.5"
                      style={{ borderColor: `${themeConfig.primary}40`, color: themeConfig.primary }}
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
                    className="w-full py-2.5 rounded-xl font-mono text-xs flex items-center justify-center space-x-2 transition-all border shadow-alien-glow"
                    style={{
                      borderColor: themeConfig.primary,
                      backgroundColor: `${themeConfig.primary}25`,
                      color: themeConfig.primary,
                    }}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>AUTHORIZE SPOTIFY LOGIN</span>
                  </button>

                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-center space-x-1 text-[11px] hover:underline pt-1"
                    style={{ color: themeConfig.secondary }}
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>How to get your free Spotify Client ID?</span>
                  </button>

                  {showGuide && (
                    <div
                      className="p-3 rounded-xl bg-black/60 border font-rajdhani text-xs text-slate-300 space-y-1.5 animate-in fade-in"
                      style={{ borderColor: `${themeConfig.secondary}40` }}
                    >
                      <div className="font-bold" style={{ color: themeConfig.secondary }}>Quick 3-Step Setup Guide:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                        <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="underline font-mono inline-flex items-center gap-0.5" style={{ color: themeConfig.secondary }}>developer.spotify.com/dashboard <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Click <strong>Create App</strong> (or select an existing App) and click <strong>Edit Settings</strong>.</li>
                        <li>Under <strong>Redirect URIs</strong>, add this EXACT link:
                          <div
                            className="my-1 font-mono text-[11px] bg-black/80 p-2 rounded border select-all font-semibold"
                            style={{ borderColor: `${themeConfig.primary}50`, color: themeConfig.primary }}
                          >
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
                <Upload className="w-3.5 h-3.5" style={{ color: themeConfig.secondary }} />
                <span>PLAY LOCAL AUDIO FILE</span>
              </span>
              <label
                className="block w-full text-center py-2 px-4 rounded-xl border font-mono text-xs cursor-pointer transition-all"
                style={{
                  borderColor: `${themeConfig.secondary}40`,
                  backgroundColor: `${themeConfig.secondary}15`,
                  color: themeConfig.secondary,
                }}
              >
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

