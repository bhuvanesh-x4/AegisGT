import React, { useState } from 'react';
import { Search, Bell, Sparkles, Menu, X } from 'lucide-react';

interface TopNavProps {
  title: string;
  subtitle: string;
  onQuickAnalyze?: () => void;
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  title,
  subtitle,
  onQuickAnalyze,
  onToggleMobileMenu,
  searchQuery,
  setSearchQuery,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-4 sm:px-8 pt-[env(safe-area-inset-top)] flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle + Title / Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open Navigation Menu"
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200/70 hover:border-brand-300 active:scale-95 flex items-center justify-center text-slate-700 lg:hidden shadow-sm shrink-0 transition-all"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        )}

        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate leading-tight">
            {title}
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Desktop Search input / Mobile Toggleable Search */}
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 text-slate-400 group-hover:text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search samples, hashes..."
            className="w-44 lg:w-72 focus:w-80 pl-10 pr-4 py-2 bg-slate-50/90 border border-slate-200/70 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 focus:bg-white transition-all duration-250 ease-out shadow-sm"
          />
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          aria-label="Search"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-brand-600 md:hidden transition-colors"
        >
          {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>

        {/* Quick Notification indicator with badge count 1 */}
        <button
          title="Security Notifications"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-brand-600 hover:bg-white hover:border-purple-200 shadow-sm transition-all duration-200 relative group active:scale-95 shrink-0"
        >
          <Bell className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
          <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white">
            1
          </span>
        </button>

        {/* Quick Action Button */}
        {onQuickAnalyze && (
          <button
            onClick={onQuickAnalyze}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-purple-glow hover:shadow-[0_10px_28px_-4px_rgba(112,71,235,0.4)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Analyze</span>
            <span className="hidden sm:inline">Sample</span>
          </button>
        )}
      </div>

      {/* Collapsible Search Input for Mobile */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-b border-slate-200/70 shadow-md md:hidden z-20 animate-page-enter">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              placeholder="Search samples, hashes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>
        </div>
      )}
    </header>
  );
};
