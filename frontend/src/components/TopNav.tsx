import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Sparkles,
  Menu,
  X,
  Shield,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Trash2,
  Check,
  FileCode,
  LayoutDashboard,
  Sliders,
  History,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { LocalDatabase } from '../services/localDatabase';
import benchmarkSamplesData from '../data/benchmarkSamples.json';
import { AnalysisRecord } from '../types';

interface TopNavProps {
  title: string;
  subtitle: string;
  onQuickAnalyze?: () => void;
  onToggleMobileMenu?: () => void;
  onNavigateTab?: (tab: string) => void;
  onSelectSampleDetail?: (record: AnalysisRecord) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'security' | 'model' | 'engine' | 'database';
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Adaptive Defense Engine Active',
    description: 'Game-theoretic Minimax & Nash Equilibrium safeguards calibrated and running in-memory.',
    time: 'Just now',
    type: 'security',
    read: false,
  },
  {
    id: '2',
    title: 'Random Forest Model Online',
    description: '35 bagged decision trees loaded with EMBER 14-feature schema (< 2ms inference latency).',
    time: '8m ago',
    type: 'model',
    read: false,
  },
  {
    id: '3',
    title: 'High-Precision PE Parser Ready',
    description: 'Direct section Shannon entropy calculation and Data Directory inspection operational.',
    time: '25m ago',
    type: 'engine',
    read: true,
  },
  {
    id: '4',
    title: 'Local Database Initialized',
    description: 'Persistent SQLite storage operational with verified integrity.',
    time: '1h ago',
    type: 'database',
    read: true,
  },
];

const NAVIGATION_ITEMS = [
  { id: 'overview', name: 'Overview Dashboard', icon: LayoutDashboard, desc: 'Real-time security telemetry' },
  { id: 'analysis', name: 'Malware Static Analysis', icon: Shield, desc: 'Inspect PE executable features' },
  { id: 'game-theory', name: 'Game Theory Defense Engine', icon: Sliders, desc: 'Payoff matrix & optimal strategies' },
  { id: 'threat-intel', name: 'Threat Intelligence', icon: Activity, desc: 'MITRE ATT&CK & attacker taxonomy' },
  { id: 'analytics', name: 'Performance Analytics', icon: Cpu, desc: 'Model evaluation & policy benchmarks' },
  { id: 'history', name: 'Analysis History', icon: History, desc: 'Audit trail of scanned executables' },
  { id: 'settings', name: 'System Settings', icon: Sliders, desc: 'Artifacts & database maintenance' },
];

export const TopNav: React.FC<TopNavProps> = ({
  title,
  subtitle,
  onQuickAnalyze,
  onToggleMobileMenu,
  onNavigateTab,
  onSelectSampleDetail,
  searchQuery: externalQuery,
  setSearchQuery: externalSetQuery,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = externalSetQuery || setInternalQuery;

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleToggleNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  // Search Results filtering
  const trimmedQ = query.trim().toLowerCase();

  const matchingPages = trimmedQ
    ? NAVIGATION_ITEMS.filter(
        (p) => p.name.toLowerCase().includes(trimmedQ) || p.desc.toLowerCase().includes(trimmedQ)
      )
    : NAVIGATION_ITEMS.slice(0, 4);

  const allRecords = LocalDatabase.getInstance().getRecords(20, 0).records;
  const matchingRecords = trimmedQ
    ? allRecords.filter(
        (r) =>
          r.sample_name.toLowerCase().includes(trimmedQ) ||
          r.sample_id.toLowerCase().includes(trimmedQ) ||
          r.classification.toLowerCase().includes(trimmedQ) ||
          r.selected_action.toLowerCase().includes(trimmedQ)
      )
    : allRecords.slice(0, 4);

  const benchmarkSamples = (benchmarkSamplesData as any[]) || [];
  const matchingBenchmarks = trimmedQ
    ? benchmarkSamples.filter(
        (s) =>
          (s.sample_name && s.sample_name.toLowerCase().includes(trimmedQ)) ||
          (s.sample_id && s.sample_id.toLowerCase().includes(trimmedQ))
      )
    : [];

  const handleSelectPage = (pageId: string) => {
    if (onNavigateTab) {
      onNavigateTab(pageId);
    }
    setSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleSelectRecord = (record: AnalysisRecord) => {
    if (onSelectSampleDetail) {
      onSelectSampleDetail(record);
    } else if (onNavigateTab) {
      onNavigateTab('history');
    }
    setSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleSelectBenchmark = (sample: any) => {
    if (onNavigateTab) {
      onNavigateTab('analysis');
    }
    setSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleViewAllInHistory = () => {
    if (onNavigateTab) {
      onNavigateTab('history');
    }
    setSearchFocused(false);
    setMobileSearchOpen(false);
  };

  return (
    <header className="h-16 sm:h-20 bg-white/85 backdrop-blur-md border-b border-slate-100/90 px-4 sm:px-8 pt-[env(safe-area-inset-top)] flex items-center justify-between sticky top-0 z-30 transition-colors">
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
        {/* Desktop Interactive Search Bar */}
        <div ref={searchContainerRef} className="relative hidden md:block">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleViewAllInHistory();
                if (e.key === 'Escape') setSearchFocused(false);
              }}
              placeholder="Search samples, hashes, pages..."
              className="w-48 lg:w-72 focus:w-80 pl-10 pr-8 py-2 bg-slate-50/90 border border-slate-200/70 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 focus:bg-white transition-all duration-250 ease-out shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Search Dropdown Palette */}
          {searchFocused && (
            <div className="absolute top-full mt-2 left-0 right-0 lg:w-96 bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {trimmedQ ? 'Search Results' : 'Quick Navigation'}
                </span>
                <span className="text-[10px] text-slate-400">Esc to close</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 p-2 space-y-2">
                {/* Pages section */}
                {matchingPages.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                      Pages & Modules
                    </div>
                    {matchingPages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <button
                          key={page.id}
                          onClick={() => handleSelectPage(page.id)}
                          className="w-full px-3 py-2 rounded-xl text-left hover:bg-purple-50/70 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-brand-600">
                                {page.name}
                              </div>
                              <div className="text-[10px] text-slate-400">{page.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* History records section */}
                {matchingRecords.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                      Analyzed Samples ({matchingRecords.length})
                    </div>
                    {matchingRecords.map((r) => (
                      <button
                        key={r.id || r.sample_id}
                        onClick={() => handleSelectRecord(r)}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                              r.classification === 'Malicious'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {r.classification === 'Malicious' ? 'MAL' : 'BEN'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-600">
                              {r.sample_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {r.sample_id} • {r.selected_action}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            r.threat_level === 'Critical' || r.threat_level === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(r.malware_probability * 100).toFixed(0)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Benchmark samples */}
                {matchingBenchmarks.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                      Benchmark Library
                    </div>
                    {matchingBenchmarks.slice(0, 3).map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectBenchmark(s)}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {s.sample_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-600 font-bold group-hover:underline">
                          Inspect &rarr;
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {matchingPages.length === 0 && matchingRecords.length === 0 && matchingBenchmarks.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No matching samples or pages found for "{query}".
                  </div>
                )}
              </div>

              {trimmedQ && (
                <button
                  onClick={handleViewAllInHistory}
                  className="w-full p-2.5 bg-slate-50 hover:bg-brand-50 text-center text-xs font-bold text-brand-700 border-t border-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Search all historical records in History page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Search Toggle Button */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          aria-label="Search"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-brand-600 md:hidden transition-colors"
        >
          {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>

        {/* Notification Bell with Interactive Dropdown Popover */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Security Notifications"
            aria-label="Security Notifications"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-200 relative group active:scale-95 shrink-0 shadow-sm ${
              notificationsOpen
                ? 'bg-brand-50 border-brand-300 text-brand-600 ring-2 ring-brand-500/20'
                : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:text-brand-600 hover:bg-white hover:border-purple-200'
            }`}
          >
            <Bell className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Popover */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Security Telemetry & Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">All caught up!</p>
                    <p className="text-[11px]">No active alerts or security events.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleNotificationRead(item.id)}
                      className={`p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-3 ${
                        !item.read ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* Icon based on type */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.type === 'security'
                            ? 'bg-rose-100 text-rose-600'
                            : item.type === 'model'
                            ? 'bg-purple-100 text-brand-600'
                            : item.type === 'engine'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {item.type === 'security' && <Shield className="w-4 h-4" />}
                        {item.type === 'model' && <Cpu className="w-4 h-4" />}
                        {item.type === 'engine' && <Activity className="w-4 h-4" />}
                        {item.type === 'database' && <Database className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs font-bold truncate ${
                              !item.read ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{item.description}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{item.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Defense Status: Operational</span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearNotifications}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

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

      {/* Collapsible Search Input & Results for Mobile Screen */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-b border-slate-200/70 shadow-xl md:hidden z-20 animate-page-enter">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleViewAllInHistory();
              }}
              placeholder="Search samples, hashes, pages..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile search quick suggestions */}
          <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
            {matchingPages.slice(0, 3).map((page) => (
              <button
                key={page.id}
                onClick={() => handleSelectPage(page.id)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center justify-between"
              >
                <span>{page.name}</span>
                <span className="text-[10px] text-brand-600 font-bold">Go &rarr;</span>
              </button>
            ))}
            {matchingRecords.slice(0, 3).map((r) => (
              <button
                key={r.id || r.sample_id}
                onClick={() => handleSelectRecord(r)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center justify-between"
              >
                <span className="truncate">{r.sample_name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    r.classification === 'Malicious' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {r.classification}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
