import React, { useEffect, useRef } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  pulsePhase: number;
}

export const NebulaParticlesCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { audioMetrics, isPlaying } = useAudioEngine();
  const { themeConfig, settings } = useThemeSettings();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate particles
    const particlesCount = Math.max(15, Math.floor(settings.particleDensity));
    const particles: Particle[] = [];
    const colors = [themeConfig.primary, themeConfig.secondary, themeConfig.accent, '#ffffff'];

    for (let i = 0; i < particlesCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.7 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let fogPhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Nebula Atmospheric Fog (Glow gradient)
      fogPhase += 0.005;
      const bassEnergy = audioMetrics.bass * (isPlaying ? 1 : 0.2);
      const fogRadius = Math.max(width, height) * (0.6 + bassEnergy * 0.2);

      const nebulaGrad = ctx.createRadialGradient(
        width / 2 + Math.sin(fogPhase) * 60,
        height / 2 + Math.cos(fogPhase * 0.8) * 60,
        20,
        width / 2,
        height / 2,
        fogRadius
      );
      nebulaGrad.addColorStop(0, `${themeConfig.primary}18`);
      nebulaGrad.addColorStop(0.4, `${themeConfig.secondary}0d`);
      nebulaGrad.addColorStop(0.8, `${themeConfig.accent}08`);
      nebulaGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Floating Energy Stars / Dust
      particles.forEach((p) => {
        p.x += p.vx * (1 + bassEnergy * 1.5);
        p.y += p.vy * (1 + bassEnergy * 1.5);
        p.pulsePhase += 0.03;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dynamicSize = p.size * (1 + bassEnergy * 0.8 + 0.3 * Math.sin(p.pulsePhase));
        const dynamicAlpha = Math.min(1, p.alpha * (0.8 + 0.4 * Math.sin(p.pulsePhase)));

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, dynamicSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = dynamicAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * settings.glowIntensity;
        ctx.fill();
        ctx.restore();
      });

      // 3. Ambient Drifting Energy Ring Wave
      if (isPlaying) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.35, 180 + bassEnergy * 40, 0, Math.PI * 2);
        ctx.strokeStyle = `${themeConfig.primary}22`;
        ctx.lineWidth = 2 + bassEnergy * 4;
        ctx.shadowColor = themeConfig.primary;
        ctx.shadowBlur = 12 * settings.glowIntensity;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [themeConfig, settings, audioMetrics, isPlaying]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};
