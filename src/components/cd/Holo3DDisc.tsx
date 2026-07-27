import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioEngine } from '../../context/AudioEngineContext';
import { useThemeSettings } from '../../context/ThemeSettingsContext';

// Local Web Audio API Scratch Feedback Engine
class ScratchAudioEngine {
  private static audioCtx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static filterNode: BiquadFilterNode | null = null;
  private static oscNode: OscillatorNode | null = null;
  private static noiseNode: AudioBufferSourceNode | null = null;

  private static init() {
    if (this.audioCtx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.audioCtx = new AudioCtx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0;

      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 800;
      this.filterNode.Q.value = 3.0;

      // 1-second white noise buffer for vinyl surface friction
      const bufferSize = this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const osc = this.audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 220;

      const synthGain = this.audioCtx.createGain();
      synthGain.gain.value = 0.25;

      noise.connect(this.filterNode);
      osc.connect(synthGain);
      synthGain.connect(this.filterNode);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      noise.start();
      osc.start();

      this.noiseNode = noise;
      this.oscNode = osc;
    } catch (e) {}
  }

  public static updateScratch(velocity: number) {
    this.init();
    if (!this.audioCtx || !this.masterGain || !this.filterNode || !this.oscNode) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const absVel = Math.abs(velocity);
    if (absVel < 0.02) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.02);
      return;
    }

    // Dynamic pitch and resonance proportional to platter velocity
    const targetFreq = Math.min(2200, Math.max(120, 180 + absVel * 40));
    const targetFilterFreq = Math.min(4200, Math.max(400, 700 + absVel * 75));
    const targetGain = Math.min(0.25, Math.max(0.02, absVel * 0.02));

    const now = this.audioCtx.currentTime;
    this.oscNode.frequency.setTargetAtTime(targetFreq, now, 0.01);
    this.filterNode.frequency.setTargetAtTime(targetFilterFreq, now, 0.01);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.01);
  }

  public static stop() {
    if (this.audioCtx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.015);
    }
  }
}

export const Holo3DDisc: React.FC = () => {
  const { currentTrack, isPlaying, currentTime, duration, seekTo, audioMetrics, genreMapping, isOverlayVisible } = useAudioEngine();
  const { themeConfig, settings } = useThemeSettings();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const platterHitboxRef = useRef<HTMLDivElement | null>(null);
  const plasmaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store volatile data in refs so the canvas RAF loop reads them without triggering re-mount
  const metricsRef = useRef(audioMetrics);
  const playingRef = useRef(isPlaying);
  metricsRef.current = audioMetrics;
  playingRef.current = isPlaying;

  // 3D Tilt State
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Rotation Angle & Velocity
  const rotationRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const prevTrackIdRef = useRef<string>(currentTrack.id);

  // DJ Scratch State
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [predictedTime, setPredictedTime] = useState<number>(currentTime);
  const [scratchVelocity, setScratchVelocity] = useState<number>(0);
  const [initialTimeAtDown, setInitialTimeAtDown] = useState<number>(currentTime);

  const isScratchingRef = useRef<boolean>(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number>(0);
  const lastPointerYRef = useRef<number>(0);
  const scratchTargetTimeRef = useRef<number>(currentTime);

  // Synchronize scratch target time with actual currentTime when not scratching
  useEffect(() => {
    if (!isScratchingRef.current) {
      scratchTargetTimeRef.current = currentTime;
      setPredictedTime(currentTime);
    }
  }, [currentTime]);

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

  // Disc Spin Loop with Genre Particle Speed Boost & Low-Resource Sleep Pause
  useEffect(() => {
    if (!isOverlayVisible) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const spinLoop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!isScratchingRef.current) {
        const baseTargetSpeed = isPlaying ? 40 : 2;
        const targetSpeed = baseTargetSpeed * (genreMapping?.particleSpeedMultiplier || 1.0);
        
        speedRef.current += (targetSpeed - speedRef.current) * 0.05;
        rotationRef.current = (rotationRef.current + speedRef.current * delta) % 360;

        if (discRef.current) {
          discRef.current.style.transform = `rotate(${rotationRef.current}deg) ${isFlipping ? 'scale(0.9) rotateY(180deg)' : 'scale(1) rotateY(0deg)'}`;
        }
      }

      animFrameRef.current = requestAnimationFrame(spinLoop);
    };

    animFrameRef.current = requestAnimationFrame(spinLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, genreMapping, isFlipping, isOverlayVisible]);

  // Safely end DJ Scratch Session & commit single Spotify Seek
  const endScratchSession = useCallback(() => {
    if (isScratchingRef.current) {
      isScratchingRef.current = false;
      setIsScratching(false);
      setScratchVelocity(0);
      ScratchAudioEngine.stop();

      if (pointerIdRef.current !== null && platterHitboxRef.current) {
        try {
          platterHitboxRef.current.releasePointerCapture(pointerIdRef.current);
        } catch (e) {}
        pointerIdRef.current = null;
      }

      const finalTarget = Math.max(0, Math.min(duration || 0, scratchTargetTimeRef.current));
      seekTo(finalTarget);
    }
  }, [duration, seekTo]);

  // Handle window level interaction cancel events
  useEffect(() => {
    const handleGlobalCancel = () => {
      if (isScratchingRef.current) endScratchSession();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScratchingRef.current) {
        endScratchSession();
      }
    };

    window.addEventListener('blur', handleGlobalCancel);
    window.addEventListener('pointercancel', handleGlobalCancel);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleGlobalCancel);
      window.removeEventListener('pointercancel', handleGlobalCancel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [endScratchSession]);

  // DJ Scratch Pointer Handlers attached to Top-Level Platter Hitbox Overlay
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!platterHitboxRef.current) return;

    try {
      platterHitboxRef.current.setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
    } catch (err) {}

    isScratchingRef.current = true;
    setIsScratching(true);
    scratchTargetTimeRef.current = currentTime;
    setInitialTimeAtDown(currentTime);
    setPredictedTime(currentTime);

    const rect = platterHitboxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastPointerYRef.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScratchingRef.current || !platterHitboxRef.current) return;

    const rect = platterHitboxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Angular rotational delta using atan2
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let angleDelta = currentAngle - lastAngleRef.current;

    // Handle wrap-around crossing (-PI to PI boundary)
    if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

    lastAngleRef.current = currentAngle;

    // Vertical drag fallback delta
    const deltaY = e.clientY - lastPointerYRef.current;
    lastPointerYRef.current = e.clientY;

    // Convert angular and vertical displacement to rotational degrees
    const degFromAngle = (angleDelta * 180) / Math.PI;
    const degFromVertical = -deltaY * 0.9;

    // Primary rotation delta (blend angular + vertical)
    const degDelta = Math.abs(degFromAngle) > 0.02 ? degFromAngle : degFromVertical;

    // Update disc visual angle directly at 60 FPS
    rotationRef.current += degDelta;
    if (discRef.current) {
      discRef.current.style.transform = `rotate(${rotationRef.current}deg) ${isFlipping ? 'scale(0.9) rotateY(180deg)' : 'scale(1) rotateY(0deg)'}`;
    }

    // Map rotational displacement to time seek delta (360 deg = 12 seconds of audio)
    const secondsPerFullRotation = 12;
    const secondsDelta = (degDelta / 360) * secondsPerFullRotation;

    const maxDuration = duration || 1;
    const nextTime = Math.max(0, Math.min(maxDuration, scratchTargetTimeRef.current + secondsDelta));
    scratchTargetTimeRef.current = nextTime;
    setPredictedTime(nextTime);
    setScratchVelocity(degDelta);

    // Update local Web Audio scratch synth feedback
    ScratchAudioEngine.updateScratch(degDelta);
  };

  const handlePointerUp = () => {
    endScratchSession();
  };

  // Handle Mouse 3D Tilt Physics
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScratchingRef.current || !containerRef.current) return;
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
    if (!isScratchingRef.current) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  const handleMouseEnter = () => {
    if (!isScratchingRef.current) {
      setIsHovered(true);
    }
  };

  // Render Genre-Specific Plasma Audio Visualizer Ring (HALTED IN SLEEP MODE)
  useEffect(() => {
    if (!isOverlayVisible) {
      return;
    }

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

      const scratchMultiplier = isScratchingRef.current ? Math.min(3, 1 + Math.abs(scratchVelocity) * 0.1) : 1;
      const bass = metricsRef.current.bass * (playingRef.current ? 1 : 0.15) * scratchMultiplier;
      const treble = metricsRef.current.treble * (playingRef.current ? 1 : 0.15) * scratchMultiplier;
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
      ctx.strokeStyle = isScratchingRef.current ? (themeConfig.accent || '#f59e0b') : themeConfig.primary;
      ctx.lineWidth = (3 + bass * 4) * (isScratchingRef.current ? 1.5 : 1);
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
  }, [themeConfig, settings, genreMapping, scratchVelocity, isOverlayVisible]);

  // Format timestamp helper
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Wrapped Progress Calculation
  const activeTimeDisplay = isScratching ? predictedTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(1, Math.max(0, activeTimeDisplay / duration)) : 0;
  const ringRadius = 148;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressPercent);

  // Orb Position on Ring
  const orbAngle = progressPercent * Math.PI * 2 - Math.PI / 2;
  const orbX = 180 + Math.cos(orbAngle) * ringRadius;
  const orbY = 180 + Math.sin(orbAngle) * ringRadius;

  // Calculate delta offset display string
  const timeOffsetSeconds = predictedTime - initialTimeAtDown;
  const offsetString = timeOffsetSeconds >= 0
    ? `↻ +${timeOffsetSeconds.toFixed(1)}s`
    : `↺ ${timeOffsetSeconds.toFixed(1)}s`;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-4 my-2 perspective-1000 select-none cursor-grab active:cursor-grabbing"
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

        {/* Decorative Progress SVG — set pointer-events-none so it never blocks disc scratch hitbox */}
        <svg
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
          viewBox="0 0 360 360"
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
            stroke={isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary}
            strokeWidth={isScratching ? "6" : "4"}
            strokeDasharray={ringCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '180px 180px',
              filter: `drop-shadow(0 0 10px ${isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary})`,
              transition: isScratching ? 'none' : 'stroke-dashoffset 0.2s linear',
            }}
          />
          <g style={{ transform: `translate(${orbX}px, ${orbY}px)` }}>
            <circle r={isScratching ? "9" : "7"} fill={isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary} className="animate-pulse" />
            <circle r="14" fill={isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary} opacity="0.4" />
          </g>
        </svg>

        {/* Visual Disc Platter Container */}
        <div className="relative w-64 h-64 rounded-full p-1 shadow-2xl z-0">
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none"
            style={{
              boxShadow: isScratching
                ? `0 0 45px ${themeConfig.accent || '#f59e0b'}, inset 0 0 25px ${themeConfig.primary}`
                : `0 0 35px ${themeConfig.primary}, inset 0 0 20px ${themeConfig.secondary}`,
              opacity: isScratching ? 1 : (isPlaying ? 0.9 : 0.4),
            }}
          />

          <div
            ref={discRef}
            className="holo-disc-surface relative w-full h-full rounded-full overflow-hidden border border-white/20 shadow-inner pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: isScratching ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-in-out',
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

            {/* Alien DJ Scratch HUD Overlay */}
            {isScratching && (
              <div className="absolute inset-0 rounded-full bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 pointer-events-none animate-in fade-in duration-150">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase animate-pulse">
                  [ SCRATCH MODE ]
                </span>
                <span className="text-xs font-mono font-bold text-amber-300/90 my-0.5 tracking-wider">
                  {offsetString}
                </span>
                <span className="text-sm font-mono font-extrabold text-white tracking-wider drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                  {formatTime(predictedTime)} <span className="text-[10px] text-slate-400">/ {formatTime(duration)}</span>
                </span>
              </div>
            )}

            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/90 border-4 border-slate-700/80 shadow-2xl flex items-center justify-center z-10 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-black border border-white/40 shadow-inner flex items-center justify-center pointer-events-none">
                <div
                  className="w-2 h-2 rounded-full opacity-80 pointer-events-none"
                  style={{
                    backgroundColor: isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary,
                    boxShadow: `0 0 6px ${isScratching ? (themeConfig.accent || '#f59e0b') : themeConfig.primary}`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Transparent Top-Level Platter Hitbox Overlay (Covers 100% of visible circular CD, z-30) */}
          <div
            ref={platterHitboxRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="absolute inset-0 rounded-full z-30 touch-none cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>
    </div>
  );
};
