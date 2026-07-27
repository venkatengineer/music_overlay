import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, ThemeConfig, ThemeId } from '../types/music';

export const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
  'dynamic-rgb': {
    id: 'dynamic-rgb',
    name: 'Dynamic Album RGB',
    primary: '#00ffaa',
    secondary: '#00e5ff',
    accent: '#b026ff',
    bgHex: '#040d12',
  },
  'alien-green': {
    id: 'alien-green',
    name: 'Alien Green',
    primary: '#00ffaa',
    secondary: '#00e5ff',
    accent: '#b026ff',
    bgHex: '#040d12',
  },
  'deep-space-blue': {
    id: 'deep-space-blue',
    name: 'Deep Space Blue',
    primary: '#00bfff',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    bgHex: '#030814',
  },
  'red-plasma': {
    id: 'red-plasma',
    name: 'Red Plasma',
    primary: '#ff0055',
    secondary: '#ff5500',
    accent: '#ff00aa',
    bgHex: '#120307',
  },
  'cyber-purple': {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    primary: '#a855f7',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    bgHex: '#0c0517',
  },
  'neon-pink': {
    id: 'neon-pink',
    name: 'Synthwave Pink',
    primary: '#ec4899',
    secondary: '#f43f5e',
    accent: '#d946ef',
    bgHex: '#17050f',
  },
  'electric-cyan': {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    primary: '#06b6d4',
    secondary: '#0ea5e9',
    accent: '#10b981',
    bgHex: '#021017',
  },
  'solar-gold': {
    id: 'solar-gold',
    name: 'Solar Gold',
    primary: '#f59e0b',
    secondary: '#ef4444',
    accent: '#eab308',
    bgHex: '#170c02',
  },
  'emerald-abyss': {
    id: 'emerald-abyss',
    name: 'Toxic Emerald',
    primary: '#10b981',
    secondary: '#84cc16',
    accent: '#06b6d4',
    bgHex: '#02140d',
  },
  'white-hologram': {
    id: 'white-hologram',
    name: 'White Hologram',
    primary: '#ffffff',
    secondary: '#80e5ff',
    accent: '#d8b4fe',
    bgHex: '#080d14',
  },
  'amber-reactor': {
    id: 'amber-reactor',
    name: 'Amber Reactor',
    primary: '#ffaa00',
    secondary: '#ff5500',
    accent: '#eab308',
    bgHex: '#140c02',
  },
  'obsidian-dark': {
    id: 'obsidian-dark',
    name: 'Obsidian Shadow',
    primary: '#94a3b8',
    secondary: '#64748b',
    accent: '#cbd5e1',
    bgHex: '#090d14',
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dynamic-rgb',
  transparency: 0.88,
  glowIntensity: 1.0,
  animationSpeed: 1.0,
  particleDensity: 90,
  alwaysOnTop: true,
  hideWhenInactive: false,
  autoPlayNext: true,
  autoMorphGenreTheme: true,
  spotifyClientId: 'b977c4d20ba7494a8dea2a61285e84ce',
  hotkeyToggle: 'Ctrl+Space',
};

interface ThemeSettingsContextType {
  settings: AppSettings;
  themeConfig: ThemeConfig;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextType | undefined>(undefined);

export const ThemeSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('aetheris_app_settings');
    if (saved) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  const activeThemeConfig = (settings.theme === 'dynamic-rgb' && settings.customThemeConfig)
    ? settings.customThemeConfig
    : (THEME_CONFIGS[settings.theme] || THEME_CONFIGS['alien-green']);

  useEffect(() => {
    localStorage.setItem('aetheris_app_settings', JSON.stringify(settings));

    // Update document root HTML attributes & CSS variables
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--primary-color', activeThemeConfig.primary);
    document.documentElement.style.setProperty('--secondary-color', activeThemeConfig.secondary);
    document.documentElement.style.setProperty('--accent-color', activeThemeConfig.accent);
    document.documentElement.style.setProperty('--primary-glow', `${activeThemeConfig.primary}cc`);
    document.documentElement.style.setProperty('--secondary-glow', `${activeThemeConfig.secondary}aa`);
    document.documentElement.style.setProperty('--accent-glow', `${activeThemeConfig.accent}cc`);
    document.documentElement.style.setProperty('--bg-alpha', settings.transparency.toString());
    document.documentElement.style.setProperty('--glow-intensity', settings.glowIntensity.toString());

    // Atmospheric Album Palette Variables (Requirements 9, 10, 11, 16)
    document.documentElement.style.setProperty('--album-primary', activeThemeConfig.primary);
    document.documentElement.style.setProperty('--album-secondary', activeThemeConfig.secondary);
    document.documentElement.style.setProperty('--album-accent', activeThemeConfig.accent);
    document.documentElement.style.setProperty('--album-bg', activeThemeConfig.bgHex || '#040d12');
    document.documentElement.style.setProperty('--album-surface', activeThemeConfig.surfaceHex || '#0a1a24');
    document.documentElement.style.setProperty('--album-glow', activeThemeConfig.glowHex || `${activeThemeConfig.primary}66`);
    document.documentElement.style.setProperty('--album-primary-x', `${activeThemeConfig.primaryPos?.x ?? 25}%`);
    document.documentElement.style.setProperty('--album-primary-y', `${activeThemeConfig.primaryPos?.y ?? 25}%`);
    document.documentElement.style.setProperty('--album-secondary-x', `${activeThemeConfig.secondaryPos?.x ?? 75}%`);
    document.documentElement.style.setProperty('--album-secondary-y', `${activeThemeConfig.secondaryPos?.y ?? 75}%`);
    document.documentElement.style.setProperty('--album-primary-weight', (activeThemeConfig.primaryWeight ?? 0.70).toString());
    document.documentElement.style.setProperty('--album-secondary-weight', (activeThemeConfig.secondaryWeight ?? 0.30).toString());
  }, [settings, activeThemeConfig]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <ThemeSettingsContext.Provider value={{ settings, themeConfig: activeThemeConfig, updateSettings, resetSettings }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
};

export const useThemeSettings = () => {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error('useThemeSettings must be used within a ThemeSettingsProvider');
  }
  return context;
};
