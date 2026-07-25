import React, { useEffect, useRef, useState } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';

export const Holo3DDisc: React.FC = () => {
  const { currentTrack, isPlaying, currentTime, duration, seekTo, audioMetrics, genreMapping } = useAudioEngine();
  const { themeConfig, settings } = useThemeSettings();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const plasmaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store volatile data in refs so the canvas RAF loop reads them without triggering re-mount
  const metricsRef = useRef(audioMetrics);
  const playingRef = useRef(isPlaying);
  metricsRef.current = audioMetrics;
  playingRef.current = isPlaying;

  // 3D Tilt State
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Rotation Angle & Velocity
  const rotationRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const prevTrackIdRef = useRef<string>(currentTrack.id);

  // Trigger smooth 3D Holographic Flip & Speed Surge on Track Change
  useEffect(() => {
    if (prevTrackIdRef.current !== currentTrack.id) {
      prevTrackIdRef.current = currentTrack.id;
      setIsFlipping(true);
      speedRef.current += 150; // Sci-fi disc spin surge on track change!

      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentTrack.id]);

  // Disc Spin Loop with Genre Particle Speed Boost
  useEffect(() => {
    let lastTime = performance.now();

    const spinLoop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const baseTargetSpeed = isPlaying ? 40 : 2;
      const targetSpeed = baseTargetSpeed * (genreMapping?.particleSpeedMultiplier || 1.0);
      
      speedRef.current += (targetSpeed - speedRef.current) * 0.05;
      rotationRef.current = (rotationRef.current + speedRef.current * delta) % 360;

      if (discRef.current) {
        discRef.current.style.transform = `rotate(${rotationRef.current}deg) ${isFlipping ? 'scale(0.9) rotateY(180deg)' : 'scale(1) rotateY(0deg)'}`;
      }

      animFrameRef.current = requestAnimationFrame(spinLoop);
    };

    animFrameRef.current = requestAnimationFrame(spinLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, genreMapping, isFlipping]);

  // Handle Mouse 3D Tilt Physics
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const tiltX = (mouseY / (rect.height / 2)) * -18;
    const tiltY = (mouseX / (rect.width / 2)) * 18;

    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Render Genre-Specific Plasma Audio Visualizer Ring
  useEffect(() => {
    const canvas = plasmaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let size = (canvas.width = canvas.height = 360);
    const center = size / 2;
    const baseRadius = 135;

    let plasmaAngle = 0;

    const renderPlasma = () => {
      ctx.clearRect(0, 0, size, size);
      plasmaAngle += 0.02 * (genreMapping?.particleSpeedMultiplier || 1.0);

      const bass = metricsRef.current.bass * (playingRef.current ? 1 : 0.15);
      const treble = metricsRef.current.treble * (playingRef.current ? 1 : 0.15);
      const rawData = metricsRef.current.rawFrequencyData;
      const waveType = genreMapping?.visualizerWaveType || 'smooth';

      const numPoints = 120;
      ctx.save();
      ctx.beginPath();

      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 + plasmaAngle;
        const freqIndex = Math.floor((i / numPoints) * (rawData.length / 2));
        const val = rawData[freqIndex] ? rawData[freqIndex] / 255 : 0;

        let wave = 0;
        let spike = 0;

        // Waveform shape depending on genre!
        if (waveType === 'jagged') {
          wave = (Math.random() - 0.5) * (15 + bass * 25);
          spike = val * 35;
        } else if (waveType === 'neon') {
          wave = Math.sin(angle * 12 + plasmaAngle * 4) * (8 + bass * 18);
          spike = val * 20 + treble * 15;
        } else if (waveType === 'breathing') {
          wave = Math.sin(plasmaAngle * 2) * (10 + bass * 12);
          spike = val * 12;
        } else if (waveType === 'pulses') {
          wave = Math.cos(angle * 8 + plasmaAngle * 3) * (10 + treble * 22);
          spike = val * 30;
        } else {
          wave = Math.sin(angle * 6 + plasmaAngle * 3) * (6 + bass * 15);
          spike = (val * 25) + (treble * 12);
        }

        const r = baseRadius + wave + spike + (bass * 10);
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.strokeStyle = themeConfig.primary;
      ctx.lineWidth = 3 + bass * 4;
      ctx.stroke();

      // Secondary Plasma Arc Layer
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 - plasmaAngle * 1.5;
        const wave = Math.cos(angle * 8) * (4 + treble * 10);
        const r = baseRadius - 8 + wave;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = themeConfig.secondary;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(renderPlasma);
    };

    renderPlasma();
    return () => cancelAnimationFrame(animId);
  }, [themeConfig, settings, genreMapping]);

  // Wrapped Progress Calculation
  const progressPercent = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const ringRadius = 148;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressPercent);

  // Orb Position on Ring
  const orbAngle = progressPercent * Math.PI * 2 - Math.PI / 2;
  const orbX = 180 + Math.cos(orbAngle) * ringRadius;
  const orbY = 180 + Math.sin(orbAngle) * ringRadius;

  const handleSeekFromPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - (rect.left + rect.width / 2);
    const clickY = e.clientY - (rect.top + rect.height / 2);

    let angle = Math.atan2(clickY, clickX) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const newProgress = angle / (Math.PI * 2);
    seekTo(newProgress * duration);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-4 my-2 perspective-1000 select-none cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-80 h-80 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`,
          transformStyle: 'preserve-3d',
        }}
      >
        <canvas
          ref={plasmaCanvasRef}
          className="absolute inset-0 pointer-events-none z-0"
          style={{ width: '360px', height: '360px', left: '-20px', top: '-20px' }}
        />

        <svg
          className="absolute inset-0 pointer-events-auto z-10 w-full h-full"
          viewBox="0 0 360 360"
          onClick={handleSeekFromPoint}
        >
          <circle
            cx="180"
            cy="180"
            r={ringRadius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="3"
          />
          <circle
            cx="180"
            cy="180"
            r={ringRadius}
            fill="none"
            stroke={themeConfig.primary}
            strokeWidth="4"
            strokeDasharray={ringCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '180px 180px',
              filter: `drop-shadow(0 0 8px ${themeConfig.primary})`,
              transition: isSeeking ? 'none' : 'stroke-dashoffset 0.2s linear',
            }}
          />
          <g style={{ transform: `translate(${orbX}px, ${orbY}px)` }}>
            <circle r="7" fill={themeConfig.primary} className="animate-pulse" />
            <circle r="12" fill={themeConfig.primary} opacity="0.4" />
          </g>
        </svg>

        <div className="relative w-64 h-64 rounded-full p-1 shadow-2xl z-0">
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300"
            style={{
              boxShadow: `0 0 35px ${themeConfig.primary}, inset 0 0 20px ${themeConfig.secondary}`,
              opacity: isPlaying ? 0.9 : 0.4,
            }}
          />

          <div
            ref={discRef}
            className="holo-disc-surface relative w-full h-full rounded-full overflow-hidden border border-white/20 shadow-inner"
            style={{
              backgroundImage: `url(${currentTrack.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-in-out',
            }}
          >
            <div className="absolute inset-0 rounded-full disc-iridescence mix-blend-color-dodge opacity-60 pointer-events-none" />

            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, transparent 30%, ${themeConfig.primary}66 31%, transparent 32%), repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.1) 10deg 20deg)`,
              }}
            />

            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />

            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/90 border-4 border-slate-700/80 shadow-2xl flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-black border border-white/40 shadow-inner flex items-center justify-center">
                <div
                  className="w-2 h-2 rounded-full opacity-80"
                  style={{ backgroundColor: themeConfig.primary, boxShadow: `0 0 6px ${themeConfig.primary}` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
