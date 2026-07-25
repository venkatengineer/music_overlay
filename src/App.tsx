import React, { useEffect } from 'react';
import { AudioEngineProvider } from './context/AudioEngineContext';
import { ThemeSettingsProvider } from './context/ThemeSettingsContext';
import { NebulaParticlesCanvas } from './components/effects/NebulaParticlesCanvas';
import { HUDContainer } from './components/hud/HUDContainer';

export const App: React.FC = () => {
  useEffect(() => {
    if ((window as any).electronAPI?.setIgnoreMouseEvents) {
      (window as any).electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, []);

  return (
    <ThemeSettingsProvider>
      <AudioEngineProvider>
        <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 overflow-hidden bg-emerald-950/25 text-slate-100 select-none transition-colors duration-500">
          {/* Background Canvas FX: Star particles, nebula fog, energy waves */}
          <NebulaParticlesCanvas />

          {/* Main Floating Glass Holographic Alien HUD Overlay */}
          <HUDContainer />
        </div>
      </AudioEngineProvider>
    </ThemeSettingsProvider>
  );
};

export default App;
