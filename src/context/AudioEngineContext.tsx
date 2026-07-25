import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Track, Album, AudioMetrics } from '../types/music';
import { SpotifyApiService, SpotifyPlayerState } from '../services/spotifyApi';
import { GenreDetectionEngine, GenreThemeMapping, GENRE_MAPPINGS } from '../services/genreEngine';
import { useThemeSettings } from './ThemeSettingsContext';
import { extractThemeFromImage } from '../utils/colorExtractor';

// Empty track placeholder — shown when no Spotify track is loaded yet
export const EMPTY_TRACK: Track = {
  id: 'empty',
  title: 'Connect Spotify to Play',
  artist: 'No track selected',
  album: '',
  coverUrl: '/cover1.png',
  duration: 0,
  source: 'spotify',
};

interface AudioEngineContextType {
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  queue: Track[];
  audioMetrics: AudioMetrics;
  albums: Album[];
  activeSource: 'galactic' | 'spotify' | 'local';
  genreMapping: GenreThemeMapping;
  isSpotifyConnected: boolean;
  spotifyUserDisplayName?: string;
  
  // Actions
  playTrack: (track: Track, contextUri?: string) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (timeInSeconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  loadLocalFile: (file: File) => void;
  setActiveSource: (source: 'galactic' | 'spotify' | 'local') => void;
  connectSpotify: () => Promise<void>;
  disconnectSpotify: () => void;
}

const AudioEngineContext = createContext<AudioEngineContextType | undefined>(undefined);

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useThemeSettings();

  const [currentTrack, setCurrentTrack] = useState<Track>(EMPTY_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeSource, setActiveSource] = useState<'galactic' | 'spotify' | 'local'>('spotify');

  const [genreMapping, setGenreMapping] = useState<GenreThemeMapping>(GENRE_MAPPINGS.ambient);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean>(!!SpotifyApiService.getStoredAccessToken());
  const [spotifyUserDisplayName, setSpotifyUserDisplayName] = useState<string | undefined>(undefined);

  // Real-time audio metrics for visualizer
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
    rawFrequencyData: new Uint8Array(128),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Audio Engine
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.onended = () => {
      nextTrack();
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    return () => {
      audio.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Handle initial URL callback check (e.g. if loaded in popup window or redirect)
  useEffect(() => {
    SpotifyApiService.checkAndHandleCallback();
  }, []);

  // Log visibility changes without stopping background music
  useEffect(() => {
    if ((window as any).electronAPI?.onWindowVisibilityChanged) {
      (window as any).electronAPI.onWindowVisibilityChanged((isVisible: boolean) => {
        console.log('[AUDIO ENGINE] Window visibility changed:', isVisible);
      });
    }
  }, []);

  // Listen for Spotify Auth Code from IPC (Electron) or postMessage (Browser Popup)
  useEffect(() => {
    const handleAuthCode = async (code: string) => {
      console.log('[RUNTIME LOG] Renderer received IPC: spotify-auth-code');
      console.log('[AUDIO ENGINE] Received Spotify OAuth code! Exchanging for token...');
      const clientId = settings.spotifyClientId || localStorage.getItem('spotify_client_id') || 'b977c4d20ba7494a8dea2a61285e84ce';
      const token = await SpotifyApiService.exchangeCodeForToken(clientId, code);
      if (token) {
        console.log('[AUDIO ENGINE] Spotify Token Exchange SUCCESS!');
        setIsSpotifyConnected(true);
        setActiveSource('spotify');
      }
    };

    if ((window as any).electronAPI?.onSpotifyAuthCode) {
      (window as any).electronAPI.onSpotifyAuthCode(handleAuthCode);
    }

    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SPOTIFY_AUTH_CODE' && event.data.code) {
        handleAuthCode(event.data.code);
      }
    };
    window.addEventListener('message', messageListener);

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [settings.spotifyClientId]);

  const optimisticTrackLockRef = useRef<{ trackId: string; timestamp: number } | null>(null);

  // Spotify Live Player Polling & Music Library Sync Engine
  useEffect(() => {
    if (isSpotifyConnected) {
      SpotifyApiService.getUserProfile().then((profile) => {
        if (profile?.display_name) setSpotifyUserDisplayName(profile.display_name);
      });

      // Load user's Spotify Liked Songs & Playlists into Archive Albums
      Promise.all([
        SpotifyApiService.getUserSavedTracks(30),
        SpotifyApiService.getUserPlaylistsWithTracks(),
      ]).then(([savedTracks, playlistAlbums]) => {
        const spotifyAlbums: Album[] = [];

        if (savedTracks.length > 0) {
          spotifyAlbums.push({
            id: 'spotify-liked-songs',
            title: '💚 Spotify Liked Songs',
            artist: spotifyUserDisplayName || 'Spotify Library',
            coverUrl: savedTracks[0]?.coverUrl || EMPTY_TRACK.coverUrl,
            tracks: savedTracks,
          });
        }

        if (playlistAlbums.length > 0) {
          spotifyAlbums.push(...playlistAlbums);
        }

        if (spotifyAlbums.length > 0) {
          console.log(`[AUDIO ENGINE] Loaded ${spotifyAlbums.length} Spotify collections into archive albums!`);
          setAlbums(spotifyAlbums);
        }
      }).catch((err) => console.warn('[AUDIO ENGINE] Error loading Spotify library:', err));

      SpotifyApiService.startPlayerPolling((state: SpotifyPlayerState | null) => {
        // State Rule: A transient Spotify API state (null, 204, or missing item) must NEVER destroy the last known valid track
        if (!state || !state.item) {
          return;
        }

        // Do not overwrite if user has actively started a local audio file
        if (activeSource === 'local' && isPlaying) return;

        // Ensure local HTML5 audio element is paused and cleared when Spotify is active
        if (audioRef.current && (audioRef.current.src || !audioRef.current.paused)) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        const fetchedTrackId = `spotify:${state.item.id}`;

        // Optimistic Track Lock: Protect user-selected track from being reverted by stale polling data (4.5s threshold)
        if (optimisticTrackLockRef.current) {
          const elapsed = Date.now() - optimisticTrackLockRef.current.timestamp;
          if (elapsed < 4500) {
            if (fetchedTrackId !== optimisticTrackLockRef.current.trackId) {
              console.log('[AUDIO ENGINE] Ignored stale Spotify polling update while optimistic track lock is active.');
              return;
            } else {
              optimisticTrackLockRef.current = null;
            }
          } else {
            optimisticTrackLockRef.current = null;
          }
        }

        const albumId = (state.item.album as any)?.id;
        const spotifyTrack: Track = {
          id: fetchedTrackId,
          title: state.item.name,
          artist: state.item.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          album: state.item.album?.name || '',
          coverUrl: state.item.album?.images?.[0]?.url || EMPTY_TRACK.coverUrl,
          duration: Math.round(state.durationMs / 1000),
          source: 'spotify',
          spotifyUri: state.item.uri,
          spotifyAlbumId: albumId,
        };

        // Atomically update state
        setCurrentTrack(spotifyTrack);
        setIsPlaying(state.isPlaying);
        setCurrentTime(Math.round(state.progressMs / 1000));
        setDuration(Math.round(state.durationMs / 1000));
        setActiveSource('spotify');

        // Trigger Album Cover Color Extraction & Auto Theme Morphing
        if (currentTrack.id !== spotifyTrack.id) {
          updateGenreAndTheme(spotifyTrack);
        }
      }, 1500);
    } else {
      SpotifyApiService.stopPlayerPolling();
      setAlbums([]);
    }

    return () => SpotifyApiService.stopPlayerPolling();
  }, [isSpotifyConnected, settings.autoMorphGenreTheme]);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;

      if (audioRef.current) {
        try {
          const sourceNode = ctx.createMediaElementSource(audioRef.current);
          sourceNode.connect(analyser);
          analyser.connect(gainNode);
          gainNode.connect(ctx.destination);
        } catch (e) {}
      }

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startSyntheticAudio = () => {
    ensureAudioContext();
    if (!audioCtxRef.current || !analyserRef.current) return;

    if (synthOscRef.current) {
      try { synthOscRef.current.stop(); } catch(e) {}
    }

    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const synthGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    synthGain.gain.setValueAtTime(0.1, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(20, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(synthGain);
    synthGain.connect(analyserRef.current);

    lfo.start();
    osc.start();
    synthOscRef.current = osc;
  };

  const stopSyntheticAudio = () => {
    if (synthOscRef.current) {
      try { synthOscRef.current.stop(); } catch (e) {}
      synthOscRef.current = null;
    }
  };

  // Audio metrics RAF loop — ONLY runs when isPlaying=true, throttled to 30 FPS
  useEffect(() => {
    if (!isPlaying) {
      setAudioMetrics({ bass: 0, mid: 0, treble: 0, overall: 0, rawFrequencyData: new Uint8Array(128) });
      return;
    }

    const dataArray = new Uint8Array(128);
    let lastUpdate = 0;

    const renderLoop = (time: number) => {
      if (time - lastUpdate > 33) { // ~30 FPS
        lastUpdate = time;
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
        }

        // Check if real Web Audio analyzer data is active (> 5)
        let maxVal = 0;
        for (let i = 0; i < 64; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }

        // If playing remote audio (e.g. Spotify remote player) or silent stream, synthesize dynamic 125 BPM beat pulse!
        if (maxVal < 5) {
          const beatFreq = 2.1; // ~125 BPM
          const t = time / 1000;
          const kick = Math.pow(Math.max(0, Math.sin(t * Math.PI * beatFreq)), 4);
          const snare = Math.pow(Math.max(0, Math.sin((t + 0.25) * Math.PI * beatFreq)), 8);
          
          for (let i = 0; i < 128; i++) {
            let synth = 0;
            if (i < 12) { // Bass
              synth = kick * 210 + Math.sin(t * 12 + i) * 40;
            } else if (i < 45) { // Mid
              synth = snare * 160 + Math.cos(t * 16 + i) * 45 + Math.sin(t * 9) * 30;
            } else { // Treble
              synth = (Math.random() * 0.4 + 0.3) * (kick * 130 + 45);
            }
            dataArray[i] = Math.min(255, Math.max(12, Math.round(synth)));
          }
        }

        let bassSum = 0, midSum = 0, trebleSum = 0;
        for (let i = 0; i < 15; i++) bassSum += dataArray[i];
        for (let i = 16; i < 50; i++) midSum += dataArray[i];
        for (let i = 51; i < 120; i++) trebleSum += dataArray[i];
        const bassVal = Math.min(1, (bassSum / 15) / 255);
        const midVal = Math.min(1, (midSum / 34) / 255);
        const trebleVal = Math.min(1, (trebleSum / 69) / 255);
        setAudioMetrics({
          bass: bassVal,
          mid: midVal,
          treble: trebleVal,
          overall: bassVal * 0.5 + midVal * 0.3 + trebleVal * 0.2,
          rawFrequencyData: new Uint8Array(dataArray),
        });
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isPlaying]);

  const updateGenreAndTheme = async (track: Track) => {
    const detectedMapping = GenreDetectionEngine.detectGenre(track);
    setGenreMapping(detectedMapping);

    if (settings.autoMorphGenreTheme) {
      if (track.coverUrl) {
        const extractedTheme = await extractThemeFromImage(track.coverUrl);
        updateSettings({ theme: extractedTheme });
      } else {
        updateSettings({ theme: detectedMapping.themeId });
      }
    }
  };

  const connectSpotify = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    const clientId = (settings.spotifyClientId || '').trim() || localStorage.getItem('spotify_client_id')?.trim() || '';
    if (clientId) localStorage.setItem('spotify_client_id', clientId);
    const token = await SpotifyApiService.loginWithPopup(clientId);
    if (token) {
      setIsSpotifyConnected(true);
      setActiveSource('spotify');
    }
  };

  const disconnectSpotify = () => {
    SpotifyApiService.logout();
    setIsSpotifyConnected(false);
    setSpotifyUserDisplayName(undefined);
    setAlbums([]);
    setCurrentTrack(EMPTY_TRACK);
    setIsPlaying(false);
    setActiveSource('galactic');
  };

  const playTrack = (track: Track, contextUri?: string) => {
    optimisticTrackLockRef.current = { trackId: track.id, timestamp: Date.now() };
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    updateGenreAndTheme(track);

    if (track.source === 'spotify' && track.spotifyUri) {
      // Pause local HTML5 audio to prevent dual audio streams playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(true);
      setActiveSource('spotify');

      const targetContextUri = contextUri || (track.spotifyAlbumId ? `spotify:album:${track.spotifyAlbumId}` : undefined);
      SpotifyApiService.play(track.spotifyUri, undefined, targetContextUri).catch(console.warn);
    } else if (track.source === 'local' && (track as any).audioUrl && audioRef.current) {
      // Pause Spotify remote player to prevent dual audio streams playing
      SpotifyApiService.pause().catch(() => {});
      ensureAudioContext();
      audioRef.current.src = (track as any).audioUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
      setActiveSource('local');
    } else {
      // Demo/galactic track — no real audio stream
      SpotifyApiService.pause().catch(() => {});
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setActiveSource('galactic');
    }
  };

  const togglePlayPause = () => {
    if (activeSource === 'spotify') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (isPlaying) {
        SpotifyApiService.pause().catch(console.warn);
        setIsPlaying(false);
      } else {
        SpotifyApiService.play().catch(console.warn);
        setIsPlaying(true);
      }
    } else if (activeSource === 'local' && audioRef.current && (currentTrack as any).audioUrl) {
      ensureAudioContext();
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
      }
    } else {
      // Galactic/demo mode
      setIsPlaying(!isPlaying);
    }
  };

  const triggerSpotifyPollImmediately = () => {
    optimisticTrackLockRef.current = null;
    const fetchState = async () => {
      const state = await SpotifyApiService.getPlaybackState();
      console.log('[SKIP 8] PLAYER STATE\n' + JSON.stringify({
        trackId: state?.item?.id || null,
        trackName: state?.item?.name || null,
        isPlaying: state?.isPlaying ?? false,
        deviceId: state?.deviceId || null
      }, null, 2));
      if (state && state.item) {
        const fetchedTrackId = `spotify:${state.item.id}`;
        const spotifyTrack: Track = {
          id: fetchedTrackId,
          title: state.item.name,
          artist: state.item.artists.map((a) => a.name).join(', '),
          album: state.item.album.name,
          coverUrl: state.item.album.images[0]?.url || EMPTY_TRACK.coverUrl,
          duration: Math.round(state.durationMs / 1000),
          source: 'spotify',
          spotifyUri: state.item.uri,
          spotifyAlbumId: (state.item.album as any)?.id,
        };
        const oldId = currentTrack.id;
        const oldName = currentTrack.title;
        setCurrentTrack(spotifyTrack);
        console.log('[SKIP 9] CURRENT TRACK UPDATE\n' + JSON.stringify({
          previousId: oldId,
          newId: fetchedTrackId,
          previousName: oldName,
          newName: state.item.name
        }, null, 2));
        setIsPlaying(state.isPlaying);
        setCurrentTime(Math.round(state.progressMs / 1000));
        setDuration(Math.round(state.durationMs / 1000));
        setActiveSource('spotify');
      }
    };
    setTimeout(fetchState, 350);
    setTimeout(fetchState, 900);
  };

  const nextTrack = async () => {
    console.log('[NEXT 2] nextTrack ENTER\n' + JSON.stringify({
      activeSource,
      currentTrackId: currentTrack?.id,
      spotifyUri: currentTrack?.spotifyUri,
      isPlaying
    }, null, 2));

    // 1. If queue has items, play next queued track
    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      playTrack(next);
      return;
    }

    // 2. If Spotify is active, use Spotify Web API
    if (activeSource === 'spotify' || isSpotifyConnected) {
      console.log('[NEXT 3] CALLING SPOTIFY API');

      // 1. CAPTURE STATE BEFORE NEXT
      try {
        const rawState = await SpotifyApiService.getRawPlaybackState();
        const beforeObj = {
          trackId: rawState?.item?.id || null,
          trackUri: rawState?.item?.uri || null,
          trackName: rawState?.item?.name || null,
          progressMs: rawState?.progress_ms ?? null,
          isPlaying: rawState?.is_playing ?? false,
          device: rawState?.device ? {
            id: rawState.device.id,
            name: rawState.device.name,
            type: rawState.device.type,
            isActive: rawState.device.is_active,
            isRestricted: rawState.device.is_restricted,
          } : null,
          context: rawState?.context ? {
            type: rawState.context.type,
            uri: rawState.context.uri,
          } : null,
          disallows: rawState?.actions?.disallows || rawState?.disallows || null,
        };
        console.log('[NEXT BEFORE]\n' + JSON.stringify(beforeObj, null, 2));
      } catch (e: any) {
        console.warn('[NEXT BEFORE CAPTURE FAILED]', e?.message || e);
      }

      // 2. SEND EXACTLY ONE NEXT REQUEST
      try {
        const res = await SpotifyApiService.next();
        console.log('[NEXT RESPONSE]\n' + JSON.stringify({ status: 204, body: res }, null, 2));
      } catch (err: any) {
        console.error('[NEXT RESPONSE]\n' + JSON.stringify({ error: err?.message || String(err) }, null, 2));
      }

      // 3. VERIFY SPOTIFY (+250ms, +500ms, +1000ms, +2000ms)
      const delays = [250, 500, 1000, 2000];
      delays.forEach((delay) => {
        setTimeout(async () => {
          try {
            const pollState = await SpotifyApiService.getRawPlaybackState();
            const verifyObj = {
              trackId: pollState?.item?.id || null,
              trackUri: pollState?.item?.uri || null,
              trackName: pollState?.item?.name || null,
              progressMs: pollState?.progress_ms ?? null,
              isPlaying: pollState?.is_playing ?? false,
            };
            console.log(`[NEXT VERIFY +${delay}ms]\n` + JSON.stringify(verifyObj, null, 2));
          } catch (e: any) {
            console.warn(`[NEXT VERIFY +${delay}ms FAILED]`, e?.message || e);
          }
        }, delay);
      });
      return;
    }

    // 3. For local/non-Spotify active source, navigate local albums list
    let currentAlbumTracks: Track[] = [];
    for (const alb of albums) {
      const foundIdx = alb.tracks.findIndex(
        (t) => t.id === currentTrack.id || (t.spotifyUri && t.spotifyUri === currentTrack.spotifyUri)
      );
      if (foundIdx !== -1) {
        currentAlbumTracks = alb.tracks;
        if (foundIdx < alb.tracks.length - 1) {
          playTrack(alb.tracks[foundIdx + 1]);
          return;
        }
        break;
      }
    }

    if (currentAlbumTracks.length > 0) {
      playTrack(currentAlbumTracks[0]);
    }
  };

  const previousTrack = async () => {
    console.log('[PREV 2] previousTrack ENTER', {
      activeSource,
      currentTrackId: currentTrack?.id,
      spotifyUri: currentTrack?.spotifyUri,
      isPlaying,
      currentTime
    });
    // 1. If track has played > 3 seconds, rewind to beginning
    if (currentTime > 3) {
      console.log('[PREV 2b] REWINDING (currentTime > 3)');
      seekTo(0);
      return;
    }

    // 2. If Spotify is active, use Spotify Web API
    if (activeSource === 'spotify' || isSpotifyConnected) {
      console.log('[PREV 3] CALLING SPOTIFY API');
      try {
        const rawState = await SpotifyApiService.getRawPlaybackState();
        const diagnosticObject = {
          device: rawState?.device ? {
            id: rawState.device.id,
            name: rawState.device.name,
            type: rawState.device.type,
            is_active: rawState.device.is_active,
            is_restricted: rawState.device.is_restricted,
          } : null,
          context: rawState?.context ? {
            type: rawState.context.type,
            uri: rawState.context.uri,
          } : null,
          item: rawState?.item ? {
            id: rawState.item.id,
            uri: rawState.item.uri,
            name: rawState.item.name,
          } : null,
          progress_ms: rawState?.progress_ms ?? null,
          is_playing: rawState?.is_playing ?? false,
          actions: {
            disallows: rawState?.actions?.disallows || rawState?.disallows || null,
          },
        };
        console.log('[PREV STATE CAPTURE]\n' + JSON.stringify(diagnosticObject, null, 2));
      } catch (e: any) {
        console.warn('[PREV STATE CAPTURE FAILED]', e?.message || e);
      }

      SpotifyApiService.previous().then(() => {
        triggerSpotifyPollImmediately();
      }).catch((err: any) => {
        console.error('[PREV ERR]', err?.message || err);
      });
      return;
    }

    // 3. For local/non-Spotify active source, navigate local albums list
    for (const alb of albums) {
      const foundIdx = alb.tracks.findIndex(
        (t) => t.id === currentTrack.id || (t.spotifyUri && t.spotifyUri === currentTrack.spotifyUri)
      );
      if (foundIdx !== -1) {
        if (foundIdx > 0) {
          playTrack(alb.tracks[foundIdx - 1]);
          return;
        }
        break;
      }
    }
  };

  const seekTo = (timeInSeconds: number) => {
    setCurrentTime(timeInSeconds);
    if (audioRef.current && currentTrack.audioUrl) {
      audioRef.current.currentTime = timeInSeconds;
    }
    if (currentTrack.source === 'spotify') {
      SpotifyApiService.seek(timeInSeconds * 1000).catch(console.warn);
    }
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) audioRef.current.volume = clamped;
    if (gainNodeRef.current) gainNodeRef.current.gain.value = clamped;
    if (currentTrack.source === 'spotify') {
      SpotifyApiService.setVolume(clamped * 100).catch(console.warn);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => setQueue([]);

  const loadLocalFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const newTrack: Track = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Media',
      album: 'Galactic Upload',
      coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
      duration: 200,
      audioUrl: url,
      source: 'local',
    };
    setActiveSource('local');
    playTrack(newTrack);
  };

  return (
    <AudioEngineContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        queue,
        audioMetrics,
        albums,
        activeSource,
        genreMapping,
        isSpotifyConnected,
        spotifyUserDisplayName,
        playTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        loadLocalFile,
        setActiveSource,
        connectSpotify,
        disconnectSpotify,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
};

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error('useAudioEngine must be used within an AudioEngineProvider');
  }
  return context;
};
