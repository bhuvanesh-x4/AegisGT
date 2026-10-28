import React, { useEffect, useRef } from 'react';

interface WaveConfig {
  amplitude: number;
  wavelength: number;
  speed: number;
  phase: number;
  yOffset: number;
  lineWidth: number;
  color: string;
}

interface HeroDustParticle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  colorRgb: string;
}

export const HeroAnimatedShield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 300);

    // 4 Layered Flowing Harmonic Sine Wave Streams
    const waves: WaveConfig[] = [
      {
        amplitude: 24,
        wavelength: 220,
        speed: 1.5,
        phase: 0,
        yOffset: 0,
        lineWidth: 1.8,
        color: 'rgba(112, 71, 235, 0.45)', // Brand purple
      },
      {
        amplitude: 18,
        wavelength: 190,
        speed: 1.8,
        phase: 1.2,
        yOffset: 6,
        lineWidth: 1.3,
        color: 'rgba(129, 140, 248, 0.38)', // Soft indigo
      },
      {
        amplitude: 28,
        wavelength: 260,
        speed: 1.1,
        phase: 2.5,
        yOffset: -6,
        lineWidth: 1.1,
        color: 'rgba(56, 189, 248, 0.32)', // Cyber cyan
      },
      {
        amplitude: 14,
        wavelength: 160,
        speed: 2.2,
        phase: 3.8,
        yOffset: 12,
        lineWidth: 0.9,
        color: 'rgba(192, 132, 252, 0.25)', // Lavender
      },
    ];

    // Atmospheric Cyber Dust Particles drifting along waves & floating freely
    const particleColors = [
      '112, 71, 235',  // Purple
      '56, 189, 248',  // Cyan
      '168, 85, 247',  // Violet
      '129, 140, 248', // Electric indigo
    ];

    const particleCount = 26;
    const particles: HeroDustParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 1.8 + 0.8;
      const baseAlpha = Math.random() * 0.45 + 0.25;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        vx: Math.random() * 0.5 + 0.15, // Horizontal drift along wave flow
        vy: (Math.random() - 0.5) * 0.35, // Gentle vertical float
        baseAlpha,
        alpha: baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        colorRgb: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }

    // Mouse tracking for parallax and wave interaction
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;

      // Parallax on the shield element
      if (shieldRef.current) {
        const cx = rect.width * 0.45;
        const cy = rect.height * 0.5;
        const dx = (e.clientX - rect.left - cx) / cx;
        const dy = (e.clientY - rect.top - cy) / cy;
        shieldRef.current.style.transform = `perspective(800px) rotateY(${dx * 9}deg) rotateX(${-dy * 7}deg) translateZ(10px)`;
      }
    };

    const handlePointerLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
      if (shieldRef.current) {
        shieldRef.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
      }
    };

    const parentBanner = canvas.closest('section');
    if (parentBanner) {
      parentBanner.addEventListener('mousemove', handlePointerMove as any, { passive: true });
      parentBanner.addEventListener('mouseleave', handlePointerLeave as any, { passive: true });
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const centerY = height * 0.48;

      // 1. Render Dynamic Flowing Wave Ribbons
      for (let wIdx = 0; wIdx < waves.length; wIdx++) {
        const wave = waves[wIdx];
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const step = 6;
        for (let x = 0; x <= width + step; x += step) {
          // Harmonic wave formula with dynamic time factor
          const wavePhase = (x / wave.wavelength) * Math.PI * 2 - (elapsed * wave.speed) + wave.phase;
          const envelope = Math.sin((x / width) * Math.PI); // Naturally tapers at edges

          // Gentle mouse displacement wave
          const mdx = x - mouseX;
          const mDist = Math.abs(mdx);
          const mouseDisplace = mDist < 100 ? (1 - mDist / 100) * 8 * Math.sin(elapsed * 3) : 0;

          const y = centerY + wave.yOffset + Math.sin(wavePhase) * wave.amplitude * envelope + mouseDisplace;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 2. Render Floating Cyber Dust & Twinkling Motes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.pulsePhase += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.22;
          p.alpha = Math.max(0.12, Math.min(0.9, p.alpha));

          p.x += p.vx + Math.cos(p.pulsePhase * 0.7) * 0.2;
          p.y += p.vy + Math.sin(p.pulsePhase * 0.5) * 0.18;

          // Mouse proximity reaction
          const mdx = p.x - mouseX;
          const mdy = p.y - mouseY;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 90 && mDist > 0) {
            const force = (1 - mDist / 90) * 1.6;
            p.x += (mdx / mDist) * force;
            p.y += (mdy / mDist) * force;
            p.alpha = Math.min(0.95, p.alpha + 0.3);
          }

          // Screen wrap
          if (p.x > width + 10) {
            p.x = -10;
            p.y = Math.random() * height;
          }
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        // Draw particle body
        ctx.fillStyle = `rgba(${p.colorRgb}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bloom halo for prominent particles
        if (p.radius > 1.3 && !prefersReducedMotion) {
          const glowRadius = p.radius * 3.2;
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
          glowGrad.addColorStop(0, `rgba(${p.colorRgb}, ${p.alpha * 0.5})`);
          glowGrad.addColorStop(1, `rgba(${p.colorRgb}, 0)`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 500;
      height = canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        startTime = performance.now();
        animationId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (parentBanner) {
        parentBanner.removeEventListener('mousemove', handlePointerMove as any);
        parentBanner.removeEventListener('mouseleave', handlePointerLeave as any);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 pointer-events-none flex items-center justify-center overflow-hidden select-none"
    >
      {/* 1. Dynamic Flowing Sine Waves & Cyber Dust Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* 2. Soft Breathing Purple Glow Aura behind the Shield */}
      <div
        className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-brand-600/25 via-purple-500/15 to-transparent blur-3xl animate-aura-breath pointer-events-none z-0"
        style={{ left: 'calc(45% - 112px)', top: 'calc(50% - 112px)' }}
      />

      {/* 3. Floating Interactive Geometric Shield & Threat Vector */}
      <div
        ref={shieldRef}
        className="relative z-10 transition-transform duration-200 ease-out animate-shield-levitate"
        style={{ transformOrigin: 'center center' }}
      >
        <svg
          className="w-24 h-28 drop-shadow-[0_8px_24px_rgba(112,71,235,0.22)]"
          viewBox="0 0 72 84"
          fill="none"
        >
          {/* Subtle Ambient Rim Glow */}
          <path
            d="M36 6 L64 20 V46 C64 64 36 78 36 78 C36 78 8 64 8 46 V20 Z"
            stroke="rgba(112, 71, 235, 0.4)"
            strokeWidth="3.5"
            fill="none"
          />

          {/* Crisp Shield Surface */}
          <path
            d="M36 6 L64 20 V46 C64 64 36 78 36 78 C36 78 8 64 8 46 V20 Z"
            stroke="#0F172A"
            strokeWidth="2.2"
            fill="#FFFFFF"
            fillOpacity="0.92"
          />

          {/* Static Threat Vector Connecting Line */}
          <line
            x1="26"
            y1="52"
            x2="46"
            y2="32"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Dynamic Traveling Telemetry Energy Pulse along Vector */}
          <line
            x1="26"
            y1="52"
            x2="46"
            y2="32"
            stroke="#7047EB"
            strokeWidth="3.2"
            strokeDasharray="8 24"
            strokeLinecap="round"
            className="opacity-90"
            style={{
              animation: 'telemetryPulse 2.2s linear infinite',
            }}
          />

          {/* Lower-Left Threat Origin Node */}
          <circle cx="26" cy="52" r="4.2" fill="#0F172A" />
          <circle cx="26" cy="52" r="6.5" stroke="#7047EB" strokeWidth="1" strokeOpacity="0.6" className="animate-ping" style={{ animationDuration: '3s' }} />

          {/* Upper-Right Threat Target Node */}
          <circle cx="46" cy="32" r="4.6" fill="#0F172A" />
          <circle cx="46" cy="32" r="2" fill="#7047EB" />
        </svg>
      </div>
    </div>
  );
};
