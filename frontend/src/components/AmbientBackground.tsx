import React, { useEffect, useRef } from 'react';

interface Particle {
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

export const AmbientBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle color palettes: Brand Purple, Lavender, Cyber Sky Blue, Soft Silver
    const colorPalettes = [
      '112, 71, 235',  // Brand primary purple
      '147, 51, 234',  // Vibrant violet
      '56, 189, 248',  // Cool cyber sky blue
      '129, 140, 248', // Soft electric indigo
      '226, 232, 240', // Ambient silver dust
    ];

    // Initialize 70 floating atmospheric dust particles
    const particleCount = 70;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 1.8 + 0.7; // 0.7px to 2.5px
      const baseAlpha = Math.random() * 0.4 + 0.2; // 0.2 to 0.6
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        vx: (Math.random() - 0.5) * 0.35, // Gentle horizontal drift
        vy: -(Math.random() * 0.45 + 0.18), // Continuous upward drift
        baseAlpha,
        alpha: baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.025 + 0.01,
        colorRgb: colorPalettes[Math.floor(Math.random() * colorPalettes.length)],
      });
    }

    // Mouse interaction for responsive wallpaper feel
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    const handlePointerMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handlePointerLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    // Handle viewport resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Animation render loop
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        // Draw constellation network lines between nearby dust particles
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 85) {
              const lineAlpha = (1 - dist / 85) * 0.07;
              ctx.strokeStyle = `rgba(112, 71, 235, ${lineAlpha})`;
              ctx.lineWidth = 0.55;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Update and draw each dust particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // Organic sinusoidal oscillation for natural floating motion
          p.pulsePhase += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.2;
          p.alpha = Math.max(0.12, Math.min(0.85, p.alpha));

          // Move particle
          p.x += p.vx + Math.cos(p.pulsePhase * 0.5) * 0.18;
          p.y += p.vy;

          // Mouse proximity reaction (gentle repellent wave)
          const mdx = p.x - mouseX;
          const mdy = p.y - mouseY;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 120 && mDist > 0) {
            const force = (1 - mDist / 120) * 1.5;
            p.x += (mdx / mDist) * force;
            p.y += (mdy / mDist) * force;
            p.alpha = Math.min(0.95, p.alpha + 0.25);
          }

          // Screen wrap
          if (p.y < -15) {
            p.y = height + 15;
            p.x = Math.random() * width;
          }
          if (p.x < -15) p.x = width + 15;
          if (p.x > width + 15) p.x = -15;
        }

        // Draw particle body
        ctx.fillStyle = `rgba(${p.colorRgb}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw soft glowing aura around larger particles for bloom effect
        if (p.radius > 1.3 && !prefersReducedMotion) {
          const glowRadius = p.radius * 3.2;
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
          glowGrad.addColorStop(0, `rgba(${p.colorRgb}, ${p.alpha * 0.45})`);
          glowGrad.addColorStop(1, `rgba(${p.colorRgb}, 0)`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Pause on hidden tab to save 100% resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* 1. Technical Grid Texture */}
      <div className="absolute inset-0 bg-tech-grid opacity-60" />

      {/* 2. Dynamic Live Wallpaper Aurora Orbs - Flowing Fluid Gradients */}
      {/* Orb 1: Deep Violet / Brand Purple Flow (Top-Left) */}
      <div
        className="absolute -top-[10%] left-[15%] w-[680px] h-[680px] rounded-full bg-gradient-to-br from-brand-600/18 via-purple-500/12 to-transparent blur-[140px] animate-wallpaper-1"
        style={{ transformOrigin: '40% 40%' }}
      />

      {/* Orb 2: Cyber Sky Blue / Cyan Flow (Top-Right) */}
      <div
        className="absolute top-[20%] -right-[8%] w-[720px] h-[720px] rounded-full bg-gradient-to-bl from-sky-400/16 via-indigo-400/10 to-transparent blur-[150px] animate-wallpaper-2"
        style={{ transformOrigin: '60% 50%' }}
      />

      {/* Orb 3: Ultraviolet / Magenta Aura (Bottom-Center) */}
      <div
        className="absolute -bottom-[15%] left-[25%] w-[750px] h-[750px] rounded-full bg-gradient-to-tr from-violet-600/15 via-purple-400/10 to-transparent blur-[160px] animate-wallpaper-3"
        style={{ transformOrigin: '50% 60%' }}
      />

      {/* Orb 4: Electric Indigo Wave (Center-Left) */}
      <div
        className="absolute top-[45%] -left-[10%] w-[620px] h-[620px] rounded-full bg-gradient-to-r from-indigo-500/14 via-brand-500/8 to-transparent blur-[130px] animate-wallpaper-4"
        style={{ transformOrigin: '30% 70%' }}
      />

      {/* 3. HTML5 Canvas: Floating Moving Dust Particles & Constellation Connections */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
