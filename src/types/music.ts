import { GenreThemeMapping } from '../services/genreEngine';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // in seconds
  audioUrl?: string; // URL or blob for web audio playback
  source: 'spotify' | 'galactic' | 'local';
  spotifyUri?: string;
  spotifyAlbumId?: string;
  genre?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year?: string;
  tracks: Track[];
}

export type ThemeId =
  | 'dynamic-rgb'
  | 'alien-green'
  | 'deep-space-blue'
  | 'red-plasma'
  | 'cyber-purple'
  | 'neon-pink'
  | 'electric-cyan'
  | 'solar-gold'
  | 'emerald-abyss'
  | 'white-hologram'
  | 'amber-reactor'
  | 'obsidian-dark';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgHex: string;
  surfaceHex?: string;
  glowHex?: string;
  primaryWeight?: number;
  secondaryWeight?: number;
  primaryPos?: { x: number; y: number };
  secondaryPos?: { x: number; y: number };
}

export interface AppSettings {
  theme: ThemeId;
  customThemeConfig?: ThemeConfig;
  transparency: number; // 0.5 - 0.98
  glowIntensity: number; // 0.2 - 2.0
  animationSpeed: number; // 0.5 - 2.0
  particleDensity: number; // 20 - 200
  alwaysOnTop: boolean;
  hideWhenInactive: boolean;
  autoPlayNext: boolean;
  autoMorphGenreTheme: boolean;
  spotifyClientId: string;
  hotkeyToggle: string; // e.g. "Ctrl+Space"
}

export interface AudioMetrics {
  bass: number;     // 0 to 1
  mid: number;      // 0 to 1
  treble: number;   // 0 to 1
  overall: number;  // 0 to 1
  rawFrequencyData: Uint8Array;
}

export interface SpotifyAuthStatus {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  userDisplayName?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      toggleAlwaysOnTop: (flag: boolean) => void;
      toggleFullscreen: () => void;
      closeWindow: () => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: any) => void;
      getAutoStart: () => Promise<boolean>;
      setAutoStart: (enable: boolean) => Promise<boolean>;
      getInitialVisibility: () => Promise<boolean>;
      onSpotifyAuthCode: (callback: (code: string) => void) => void;
      onWindowVisibilityChanged: (callback: (isVisible: boolean) => void) => void;
    };
  }
}
