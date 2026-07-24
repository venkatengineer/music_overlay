import { Track, ThemeId } from '../types/music';

export type MusicGenreCategory = 'synthwave' | 'metal' | 'ambient' | 'jazz' | 'pop';

export interface GenreThemeMapping {
  genre: MusicGenreCategory;
  displayName: string;
  themeId: ThemeId;
  visualizerWaveType: 'smooth' | 'jagged' | 'pulses' | 'neon' | 'breathing';
  particleSpeedMultiplier: number;
  glowMultiplier: number;
}

export const GENRE_MAPPINGS: Record<MusicGenreCategory, GenreThemeMapping> = {
  synthwave: {
    genre: 'synthwave',
    displayName: 'SYNTHWAVE / CYBERPUNK',
    themeId: 'deep-space-blue',
    visualizerWaveType: 'neon',
    particleSpeedMultiplier: 1.6,
    glowMultiplier: 1.5,
  },
  metal: {
    genre: 'metal',
    displayName: 'ROCK / HEAVY METAL',
    themeId: 'red-plasma',
    visualizerWaveType: 'jagged',
    particleSpeedMultiplier: 2.2,
    glowMultiplier: 1.8,
  },
  ambient: {
    genre: 'ambient',
    displayName: 'AMBIENT / DEEP SPACE',
    themeId: 'alien-green',
    visualizerWaveType: 'smooth',
    particleSpeedMultiplier: 0.6,
    glowMultiplier: 1.0,
  },
  jazz: {
    genre: 'jazz',
    displayName: 'JAZZ / ACOUSTIC SOLAR',
    themeId: 'amber-reactor',
    visualizerWaveType: 'breathing',
    particleSpeedMultiplier: 0.9,
    glowMultiplier: 1.2,
  },
  pop: {
    genre: 'pop',
    displayName: 'EDM / HOLOGRAPHIC POP',
    themeId: 'white-hologram',
    visualizerWaveType: 'pulses',
    particleSpeedMultiplier: 1.4,
    glowMultiplier: 1.4,
  },
};

export class GenreDetectionEngine {
  public static detectGenre(track: Track): GenreThemeMapping {
    const text = `${track.title} ${track.artist} ${track.album}`.toLowerCase();

    // 1. Heavy Metal / Rock Keyword Matching
    if (text.match(/\b(rock|metal|punk|heavy|vortex|rage|core|distortion|thunder|industrial)\b/i)) {
      return GENRE_MAPPINGS.metal;
    }
    // 2. Synthwave / Cyberpunk
    if (text.match(/\b(synth|cyber|retrowave|neon|wave|quantum|drive|vector|grid|matrix)\b/i)) {
      return GENRE_MAPPINGS.synthwave;
    }
    // 3. Jazz / Acoustic / Solar
    if (text.match(/\b(jazz|soul|acoustic|solar|amber|blues|chill|groove|lounge|sunset)\b/i)) {
      return GENRE_MAPPINGS.jazz;
    }
    // 4. Pop / EDM / Dance
    if (text.match(/\b(edm|dance|pop|trance|house|holo|starlight|echo|pulse|remix|electric)\b/i)) {
      return GENRE_MAPPINGS.pop;
    }
    // 5. Default: Ambient Space Odyssey
    return GENRE_MAPPINGS.ambient;
  }
}
