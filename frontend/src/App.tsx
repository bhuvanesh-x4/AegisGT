import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import {
  LayoutDashboard,
  ShieldAlert,
  Cpu,
  History,
  Menu,
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { AmbientBackground } from './components/AmbientBackground';
import { OverviewPage } from './pages/OverviewPage';
import { MalwareAnalysisPage } from './pages/MalwareAnalysisPage';
import { GameTheoryPage } from './pages/GameTheoryPage';
import { ThreatIntelligencePage } from './pages/ThreatIntelligencePage';
import { PerformanceAnalyticsPage } from './pages/PerformanceAnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

import { fetchHealth, fetchDashboardSummary } from './services/api';
import { DashboardSummary, AnalysisRecord } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<{ online: boolean; version: string }>({
    online: false,
    version: 'v1.0.0',
  });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);

  // Cross-page state transfers
  const [gtInitialProbability, setGtInitialProbability] = useState<number>(0.5);
  const [gtLinkedSampleId, setGtLinkedSampleId] = useState<string | undefined>(undefined);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<AnalysisRecord | null>(null);

  const refreshSummary = async () => {
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    // Health check
    fetchHealth()
      .then((h) => {
        setSystemStatus({ online: true, version: h.version });
      })
      .catch(() => {
        setSystemStatus({ online: false, version: 'v1.0.0' });
      });

    refreshSummary();
  }, []);

  // Native Capacitor Android Initialization & Back Button Handling
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0F172A' }).catch(() => {});
      SplashScreen.hide().catch(() => {});

      const backListener = CapApp.addListener('backButton', () => {
        // Priority 1: Close mobile navigation drawer if open
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          return;
        }

        // Priority 2: Close sample detail modal if open
        if (selectedHistoryRecord) {
          setSelectedHistoryRecord(null);
          return;
        }

        // Priority 3: Navigate back to overview if on a secondary tab
        if (activeTab !== 'overview') {
          setActiveTab('overview');
          return;
        }

        // Priority 4: Exit app if already on overview
        CapApp.exitApp();
      });

      return () => {
        backListener.then((sub) => sub.remove()).catch(() => {});
      };
    }
  }, [isMobileMenuOpen, selectedHistoryRecord, activeTab]);

  const handleNavigateToAnalysis = () => {
    setActiveTab('analysis');
  };

  const handleAnalyzeSuccess = (_record: AnalysisRecord) => {
    refreshSummary();
  };

  const handleSendToGameTheory = (p: number, sampleId: string) => {
    setGtInitialProbability(p);
    setGtLinkedSampleId(sampleId);
    setActiveTab('game-theory');
  };

  const handleSelectSampleDetail = (record: AnalysisRecord) => {
    setSelectedHistoryRecord(record);
    setActiveTab('history');
  };

  const getPageMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Malware Defense Intelligence',
          subtitle: 'Static executable feature analysis, threat evaluation, and game-theoretic optimization.',
        };
      case 'analysis':
        return {
          title: 'Malware Static Analysis',
          subtitle: 'Safe static inspection of Windows PE headers, entropy calculation, and threat scoring.',
        };
      case 'game-theory':
        return {
          title: 'Game Theory Defense Engine',
          subtitle: 'Strategic attacker-defender optimization, payoff matrices, and sensitivity curves.',
        };
      case 'threat-intel':
        return {
          title: 'Threat Intelligence',
          subtitle: 'Attacker strategy taxonomy, MITRE ATT&CK mapping, and mathematical utility modeling.',
        };
      case 'analytics':
        return {
          title: 'Performance Analytics',
          subtitle: 'Model evaluation metrics, confusion matrix, ROC curve, and defensive policy benchmarks.',
        };
      case 'history':
        return {
          title: 'Analysis History',
          subtitle: 'Historical inspection audit trail backed by SQLite database records.',
        };
      case 'settings':
        return {
          title: 'System Settings',
          subtitle: 'Model artifact management, strategic defense presets, and database administration.',
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: 'Adaptive cybersecurity defense platform.',
        };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="flex min-h-screen bg-[#F6F7FB] relative overflow-x-hidden font-sans">
      {/* Dynamic Ambient Background */}
      <AmbientBackground />

      {/* Sidebar Navigation: Desktop persistent + Mobile slide-out drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full overflow-x-hidden">
        <TopNav
          title={meta.title}
          subtitle={meta.subtitle}
          onQuickAnalyze={() => setActiveTab('analysis')}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Page Container with Hardware-Accelerated Smooth Entrance */}
        <main className="flex-1 pb-24 lg:pb-16 w-full">
          <div key={activeTab} className="animate-page-enter">
            {activeTab === 'overview' && (
              <OverviewPage
                summary={summary}
                loading={loadingSummary}
                onNavigateToAnalysis={handleNavigateToAnalysis}
                onSelectSampleDetail={handleSelectSampleDetail}
              />
            )}

            {activeTab === 'analysis' && (
              <MalwareAnalysisPage
                onAnalyzeSuccess={handleAnalyzeSuccess}
                onSendToGameTheory={handleSendToGameTheory}
              />
            )}

            {activeTab === 'game-theory' && (
              <GameTheoryPage
                initialProbability={gtInitialProbability}
                sampleId={gtLinkedSampleId}
              />
            )}

            {activeTab === 'threat-intel' && <ThreatIntelligencePage />}

            {activeTab === 'analytics' && <PerformanceAnalyticsPage />}

            {activeTab === 'history' && (
              <HistoryPage
                selectedRecordFromParent={selectedHistoryRecord}
                onClearSelectedRecord={() => setSelectedHistoryRecord(null)}
              />
            )}

            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phone Screens < lg) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/70 z-40 flex items-center justify-around px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-subtle lg:hidden"
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'overview'
              ? 'text-brand-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'analysis'
              ? 'text-brand-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className={`w-5 h-5 ${activeTab === 'analysis' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('game-theory')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'game-theory'
              ? 'text-brand-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Cpu className={`w-5 h-5 ${activeTab === 'game-theory' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'history'
              ? 'text-brand-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <History className={`w-5 h-5 ${activeTab === 'history' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">History</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-slate-400 hover:text-slate-700 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
