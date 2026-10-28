import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Cpu,
  Binary,
  BarChart3,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: { online: boolean; version: string };
  isOpen?: boolean;
  onClose?: () => void;
}

interface SidebarParticle {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  baseAlpha: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  colorRgb: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  isOpen = false,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis', label: 'Malware Analysis', icon: ShieldAlert },
    { id: 'game-theory', label: 'Game Theory Engine', icon: Cpu },
    { id: 'threat-intel', label: 'Threat Intelligence', icon: Binary },
    { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'history', label: 'Analysis History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Dust particles flow animation specifically inside the sidebar navigation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 256);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const colorPalettes = [
      '112, 71, 235',  // Brand primary purple
      '147, 51, 234',  // Vibrant violet
      '56, 189, 248',  // Cool cyber blue
      '168, 85, 247',  // Soft lavender
      '203, 213, 225', // Slate dust
    ];

    const particleCount = 28;
    const particles: SidebarParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 1.6 + 0.6;
      const baseAlpha = Math.random() * 0.45 + 0.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        vy: -(Math.random() * 0.4 + 0.15),
        vx: (Math.random() - 0.5) * 0.25,
        baseAlpha,
        alpha: baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        colorRgb: colorPalettes[Math.floor(Math.random() * colorPalettes.length)],
      });
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        // Draw subtle connection lines between close dust motes in sidebar
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 65) {
              const lineAlpha = (1 - dist / 65) * 0.08;
              ctx.strokeStyle = `rgba(112, 71, 235, ${lineAlpha})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.pulsePhase += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.2;
          p.alpha = Math.max(0.1, Math.min(0.85, p.alpha));

          p.x += p.vx + Math.cos(p.pulsePhase * 0.6) * 0.15;
          p.y += p.vy;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        ctx.fillStyle = `rgba(${p.colorRgb}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.radius > 1.2 && !prefersReducedMotion) {
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.8);
          glowGrad.addColorStop(0, `rgba(${p.colorRgb}, ${p.alpha * 0.4})`);
          glowGrad.addColorStop(1, `rgba(${p.colorRgb}, 0)`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 256;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animationId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <>
      {/* Dust Particles Flow Canvas specifically inside the Sidebar */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Brand Header */}
      <div className="p-6 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] flex items-center justify-between border-b border-slate-100/70 relative z-10">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-purple-glow text-white transition-all duration-300 group-hover:scale-105 group-hover:rotate-2">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
              Aegis<span className="text-brand-600">GT</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              ADAPTIVE DEFENSE
            </p>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-600 lg:hidden transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto relative z-10" aria-label="Main Navigation">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 group relative outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 active:scale-[0.98] ${
                isActive
                  ? 'bg-gradient-to-r from-[#6B46FE] to-[#7852FF] text-white shadow-[0_4px_18px_rgba(107,70,254,0.38)] ring-1 ring-purple-400/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-all duration-200 ${
                    isActive
                      ? 'text-white scale-105'
                      : 'text-slate-400 group-hover:text-brand-600 group-hover:scale-110'
                  }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status & Footer Profile */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100/70 space-y-3 relative z-10">
        <div className="bg-white/80 hover:bg-white rounded-2xl p-3 border border-slate-100/80 transition-all duration-200 hover:border-purple-200/50 hover:shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Defense Engine
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                systemStatus.online
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {systemStatus.online ? 'Active' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            RF Model <span className="font-semibold text-slate-700">{systemStatus.version}</span>
          </p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-2xl hover:bg-white/70 transition-colors duration-150">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-purple-400 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white">
            SR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">SecOps Analyst</p>
            <p className="text-[10px] text-slate-400 truncate">Adaptive Defense</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-slate-200/60 hidden lg:flex flex-col shrink-0 min-h-screen relative z-20 select-none shadow-[2px_0_16px_rgba(0,0,0,0.02)] overflow-hidden">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Navigation Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <aside
            className="relative w-72 max-w-[85vw] bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 flex flex-col h-full z-10 shadow-2xl overflow-hidden animate-page-enter select-none"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
