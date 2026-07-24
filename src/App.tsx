import React from 'react';
import { AudioEngineProvider } from './context/AudioEngineContext';
import { ThemeSettingsProvider } from './context/ThemeSettingsContext';
import { NebulaParticlesCanvas } from './components/effects/NebulaParticlesCanvas';
import { HUDContainer } from './components/hud/HUDContainer';

export const App: React.FC = () => {
  return (
    <ThemeSettingsProvider>
      <AudioEngineProvider>
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-transparent text-slate-100">
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
