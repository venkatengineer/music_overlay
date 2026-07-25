import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, ThemeConfig, ThemeId } from '../types/music';

export const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
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
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'alien-green',
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

  const themeConfig = THEME_CONFIGS[settings.theme] || THEME_CONFIGS['alien-green'];

  useEffect(() => {
    localStorage.setItem('aetheris_app_settings', JSON.stringify(settings));

    // Update document root HTML attributes & CSS variables
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--primary-color', themeConfig.primary);
    document.documentElement.style.setProperty('--secondary-color', themeConfig.secondary);
    document.documentElement.style.setProperty('--accent-color', themeConfig.accent);
    document.documentElement.style.setProperty('--primary-glow', `${themeConfig.primary}80`);
    document.documentElement.style.setProperty('--secondary-glow', `${themeConfig.secondary}60`);
    document.documentElement.style.setProperty('--accent-glow', `${themeConfig.accent}80`);
    document.documentElement.style.setProperty('--bg-alpha', settings.transparency.toString());
    document.documentElement.style.setProperty('--glow-intensity', settings.glowIntensity.toString());
  }, [settings, themeConfig]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <ThemeSettingsContext.Provider value={{ settings, themeConfig, updateSettings, resetSettings }}>
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
