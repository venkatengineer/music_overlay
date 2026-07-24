import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, Album, AudioMetrics } from '../types/music';
import { SpotifyApiService, SpotifyPlayerState } from '../services/spotifyApi';
import { GenreDetectionEngine, GenreThemeMapping, GENRE_MAPPINGS } from '../services/genreEngine';
import { useThemeSettings } from './ThemeSettingsContext';

export const GALACTIC_TRACKS: Track[] = [
  {
    id: 'gal-1',
    title: 'Aetheris Horizon',
    artist: 'Xenon Core',
    album: 'Orion Sector VII',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    duration: 214,
    source: 'galactic',
    genre: 'ambient',
  },
  {
    id: 'gal-2',
    title: 'Quantum Synth Cyberpunk',
    artist: 'Cybernetic Echoes',
    album: 'Matrix Core',
    coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    duration: 185,
    source: 'galactic',
    genre: 'synthwave',
  },
  {
    id: 'gal-3',
    title: 'Vortex Metal Distortion',
    artist: 'Rage Protocol',
    album: 'Heavy Industrial',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    duration: 240,
    source: 'galactic',
    genre: 'metal',
  },
  {
    id: 'gal-4',
    title: 'Solar Acoustic Jazz',
    artist: 'Nebula Weaver',
    album: 'Amber Lounge',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    duration: 298,
    source: 'galactic',
    genre: 'jazz',
  },
];

export const DEMO_ALBUMS: Album[] = [
  {
    id: 'alb-1',
    title: 'Orion Sector VII',
    artist: 'Xenon Core',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    year: '3042',
    tracks: [GALACTIC_TRACKS[0], GALACTIC_TRACKS[1]],
  },
  {
    id: 'alb-2',
    title: 'Zero-G Transmissions',
    artist: 'Vortex Protocol',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    year: '3044',
    tracks: [GALACTIC_TRACKS[2], GALACTIC_TRACKS[3]],
  },
];

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
  playTrack: (track: Track) => void;
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

  const [currentTrack, setCurrentTrack] = useState<Track>(GALACTIC_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(GALACTIC_TRACKS[0].duration);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([GALACTIC_TRACKS[1], GALACTIC_TRACKS[2], GALACTIC_TRACKS[3]]);
  const [albums] = useState<Album[]>(DEMO_ALBUMS);
  const [activeSource, setActiveSource] = useState<'galactic' | 'spotify' | 'local'>('galactic');

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

  // Listen for Spotify Auth Code from IPC (Electron) or postMessage (Browser Popup)
  useEffect(() => {
    const handleAuthCode = async (code: string) => {
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

  // Spotify Live Player Polling Engine
  useEffect(() => {
    if (isSpotifyConnected) {
      SpotifyApiService.getUserProfile().then((profile) => {
        if (profile?.display_name) setSpotifyUserDisplayName(profile.display_name);
      });

      SpotifyApiService.startPlayerPolling((state: SpotifyPlayerState | null) => {
        if (state && state.item) {
          const spotifyTrack: Track = {
            id: `spotify:${state.item.id}`,
            title: state.item.name,
            artist: state.item.artists.map((a) => a.name).join(', '),
            album: state.item.album.name,
            coverUrl: state.item.album.images[0]?.url || GALACTIC_TRACKS[0].coverUrl,
            duration: Math.round(state.durationMs / 1000),
            source: 'spotify',
            spotifyUri: state.item.uri,
          };

          setCurrentTrack(spotifyTrack);
          setIsPlaying(state.isPlaying);
          setCurrentTime(Math.round(state.progressMs / 1000));
          setDuration(Math.round(state.durationMs / 1000));
          setActiveSource('spotify');

          // Trigger Auto-Genre Morphing
          const detected = GenreDetectionEngine.detectGenre(spotifyTrack);
          setGenreMapping(detected);
          if (settings.autoMorphGenreTheme) {
            updateSettings({ theme: detected.themeId });
          }
        }
      }, 1500);
    } else {
      SpotifyApiService.stopPlayerPolling();
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

  // Continuous animation loop computing Audio Metrics at 144 FPS
  useEffect(() => {
    const dataArray = new Uint8Array(128);
    let phase = 0;

    const renderLoop = () => {
      if (isPlaying) {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          let bassSum = 0;
          for (let i = 0; i < 15; i++) bassSum += dataArray[i];
          let midSum = 0;
          for (let i = 16; i < 50; i++) midSum += dataArray[i];
          let trebleSum = 0;
          for (let i = 51; i < 120; i++) trebleSum += dataArray[i];

          const bassVal = Math.min(1, (bassSum / 15) / 255);
          const midVal = Math.min(1, (midSum / 34) / 255);
          const trebleVal = Math.min(1, (trebleSum / 69) / 255);
          const overallVal = (bassVal * 0.5 + midVal * 0.3 + trebleVal * 0.2);

          setAudioMetrics({
            bass: bassVal,
            mid: midVal,
            treble: trebleVal,
            overall: overallVal,
            rawFrequencyData: new Uint8Array(dataArray),
          });
        } else {
          phase += 0.05;
          const bassVal = 0.5 + 0.4 * Math.sin(phase * 1.5);
          const midVal = 0.4 + 0.3 * Math.cos(phase * 2.1);
          const trebleVal = 0.3 + 0.3 * Math.sin(phase * 4.2);

          setAudioMetrics({
            bass: bassVal,
            mid: midVal,
            treble: trebleVal,
            overall: (bassVal + midVal + trebleVal) / 3,
            rawFrequencyData: dataArray,
          });
        }

        if (!currentTrack.audioUrl && activeSource !== 'spotify') {
          setCurrentTime((prev) => {
            if (prev >= duration) {
              nextTrack();
              return 0;
            }
            return prev + 0.1;
          });
        }
      } else {
        setAudioMetrics((prev) => ({
          bass: prev.bass * 0.9,
          mid: prev.mid * 0.9,
          treble: prev.treble * 0.9,
          overall: prev.overall * 0.9,
          rawFrequencyData: new Uint8Array(128),
        }));
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTrack, activeSource, duration]);

  const updateGenreAndTheme = (track: Track) => {
    const detectedMapping = GenreDetectionEngine.detectGenre(track);
    setGenreMapping(detectedMapping);

    if (settings.autoMorphGenreTheme) {
      updateSettings({ theme: detectedMapping.themeId });
    }
  };

  const connectSpotify = async () => {
    const token = await SpotifyApiService.loginWithPopup(settings.spotifyClientId);
    if (token) {
      setIsSpotifyConnected(true);
      setActiveSource('spotify');
    }
  };

  const disconnectSpotify = () => {
    SpotifyApiService.logout();
    setIsSpotifyConnected(false);
    setSpotifyUserDisplayName(undefined);
    setActiveSource('galactic');
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 180);
    setIsPlaying(true);
    ensureAudioContext();
    updateGenreAndTheme(track);

    if (track.source === 'spotify' && track.spotifyUri) {
      SpotifyApiService.play(track.spotifyUri).catch(console.warn);
      setActiveSource('spotify');
    } else if (track.audioUrl && audioRef.current) {
      stopSyntheticAudio();
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch(console.warn);
    } else {
      if (audioRef.current) audioRef.current.pause();
      startSyntheticAudio();
    }
  };

  const togglePlayPause = () => {
    ensureAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      if (currentTrack.source === 'spotify') SpotifyApiService.pause().catch(console.warn);
      stopSyntheticAudio();
    } else {
      setIsPlaying(true);
      if (currentTrack.source === 'spotify') {
        SpotifyApiService.play().catch(console.warn);
      } else if (currentTrack.audioUrl && audioRef.current) {
        audioRef.current.play().catch(console.warn);
      } else {
        startSyntheticAudio();
      }
    }
  };

  const nextTrack = () => {
    if (currentTrack.source === 'spotify') {
      SpotifyApiService.next().catch(console.warn);
    } else if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      playTrack(next);
    } else if (isRepeat) {
      playTrack(currentTrack);
    } else {
      const currentIndex = GALACTIC_TRACKS.findIndex((t) => t.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % GALACTIC_TRACKS.length;
      playTrack(GALACTIC_TRACKS[nextIndex]);
    }
  };

  const previousTrack = () => {
    if (currentTrack.source === 'spotify') {
      SpotifyApiService.previous().catch(console.warn);
    } else if (currentTime > 3) {
      seekTo(0);
    } else {
      const currentIndex = GALACTIC_TRACKS.findIndex((t) => t.id === currentTrack.id);
      const prevIndex = (currentIndex - 1 + GALACTIC_TRACKS.length) % GALACTIC_TRACKS.length;
      playTrack(GALACTIC_TRACKS[prevIndex]);
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
