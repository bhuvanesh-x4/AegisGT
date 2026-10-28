import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Settings,
  Cpu,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sliders,
  Shield,
  Server,
  Layers,
  Globe,
  Wifi,
  Smartphone,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  triggerModelTrain,
  clearHistoryRecords,
  seedDemoData,
  getApiBaseUrl,
  setApiBaseUrl,
  fetchHealth,
  getAppExecutionMode,
  setAppExecutionMode,
  ExecutionMode,
} from '../services/api';

export const SettingsPage: React.FC = () => {
  const [retraining, setRetraining] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Mobile / Backend Server Connectivity state
  const [apiBaseInput, setApiBaseInput] = useState<string>(getApiBaseUrl());
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(getAppExecutionMode());

  const handleModeChange = (mode: ExecutionMode) => {
    setExecutionMode(mode);
    setAppExecutionMode(mode);
    setStatusMsg(
      `Engine switched to: ${
        mode === 'standalone'
          ? 'Standalone Client Engine (100% Offline)'
          : mode === 'remote'
          ? 'Remote Backend Server'
          : 'Adaptive Auto'
      }`
    );
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setStatusMsg(null);
    try {
      await triggerModelTrain();
      setStatusMsg('Model retraining completed successfully.');
    } catch (err: any) {
      setStatusMsg(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await seedDemoData();
      setStatusMsg(`Successfully seeded ${res.added_records} benchmark records.`);
    } catch (err: any) {
      setStatusMsg(`Seeding failed: ${err.message}`);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all SQLite analysis history?')) {
      try {
        const res = await clearHistoryRecords();
        setStatusMsg(res.message);
      } catch (err: any) {
        setStatusMsg(`Failed to clear: ${err.message}`);
      }
    }
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiBaseInput);
    setStatusMsg(`API Server base URL saved: ${getApiBaseUrl()}`);
  };

  const handleResetApiUrl = () => {
    const defaultUrl = isNative ? 'http://10.0.2.2:8000/api' : '/api';
    setApiBaseInput(defaultUrl);
    setApiBaseUrl(defaultUrl);
    setStatusMsg(`API Server base URL reset to default: ${defaultUrl}`);
    setConnectionStatus('idle');
    setTestMessage(null);
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setTestMessage('Testing connection to backend service...');
    // Temporarily save current input so fetchHealth tests it
    setApiBaseUrl(apiBaseInput);
    try {
      const health = await fetchHealth();
      setConnectionStatus('success');
      setTestMessage(`Connected successfully! Server is ${health.status} (Model v${health.version})`);
    } catch (err: any) {
      setConnectionStatus('error');
      setTestMessage(
        `Connection failed: ${err.message}. If testing on an Android device or emulator, ensure your backend is running with "uvicorn --host 0.0.0.0 --port 8000".`
      );
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Settings & Configuration</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Model persistence configuration, Android mobile server connectivity, and database maintenance.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 bg-purple-50 border border-brand-200 rounded-2xl text-xs font-semibold text-brand-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Mobile & Backend Server Connectivity Card */}
      <section className="bg-white rounded-3xl p-6 border border-brand-100 shadow-subtle space-y-5 interactive-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Backend Server & Mobile Connectivity</h3>
              <p className="text-[11px] text-slate-400">Configure remote or local backend endpoint for Android</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {isNative ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                <span>Android Native Mode</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Web Browser Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Execution Mode Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Engine Architecture & Execution Mode:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('standalone')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  executionMode === 'standalone'
                    ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Standalone (Offline)</span>
                  {executionMode === 'standalone' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  In-memory TS Game Theory & ML. 100% offline, zero server required.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('remote')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  executionMode === 'remote'
                    ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Remote Backend</span>
                  {executionMode === 'remote' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Connects to FastAPI server on PC or cloud via REST API.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('auto')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  executionMode === 'auto'
                    ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Adaptive Auto</span>
                  {executionMode === 'auto' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Tries remote server if configured, falls back seamlessly to local engine.
                </p>
              </button>
            </div>
          </div>

          {executionMode === 'standalone' ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Standalone Client Engine Active:</span> All PE malware classification, Random Forest predictions, Game-Theoretic payoffs, sensitivity analysis, and SQLite history work <strong>completely on-device without an external backend</strong> or internet connection.
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Active Remote API Base URL:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  placeholder="e.g. http://10.0.2.2:8000/api or https://api.aegisgt.com/api"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveApiUrl}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold transition-all shadow-sm"
                  >
                    Save URL
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'testing'}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-brand-300 bg-white active:scale-95 text-slate-700 font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Wifi className={`w-3.5 h-3.5 text-brand-600 ${connectionStatus === 'testing' ? 'animate-pulse' : ''}`} />
                    <span>{connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                <button
                  onClick={() => { setApiBaseInput('http://10.0.2.2:8000/api'); setApiBaseUrl('http://10.0.2.2:8000/api'); }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-[10px] font-mono text-slate-600 transition-colors"
                >
                  Android Emulator (10.0.2.2:8000)
                </button>
                <button
                  onClick={() => { setApiBaseInput('http://127.0.0.1:8000/api'); setApiBaseUrl('http://127.0.0.1:8000/api'); }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-[10px] font-mono text-slate-600 transition-colors"
                >
                  Localhost (127.0.0.1:8000)
                </button>
                <button
                  onClick={handleResetApiUrl}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 transition-colors"
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}

          {/* Connection Test Feedback Box */}
          {testMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                connectionStatus === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : connectionStatus === 'error'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                  : 'bg-purple-50/70 border-purple-200 text-brand-800'
              }`}
            >
              {connectionStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              {connectionStatus === 'testing' && <RefreshCw className="w-4 h-4 text-brand-600 animate-spin shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{testMessage}</span>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* ML Model Configuration Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-5 interactive-card">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Machine Learning Artifacts</h3>
              <p className="text-[11px] text-slate-400">Random Forest static PE classifier</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Active Model:</span>
              <span className="font-semibold text-slate-800">Random Forest Bagged Ensemble (v1.0.0)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Feature Schema:</span>
              <span className="font-semibold text-slate-800">EMBER 14-Feature Static PE Vectors</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Preprocessing:</span>
              <span className="font-semibold text-slate-800">StandardScaler (Fit strictly on Train Split)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Persistence Store:</span>
              <span className="font-mono text-slate-800">backend/artifacts/malware_classifier.joblib</span>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white text-xs font-bold shadow-purple-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining Pipeline...' : 'Retrain Classifier & Re-evaluate'}</span>
          </button>
        </div>

        {/* Database & Persistence Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-5 interactive-card">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & History Storage</h3>
              <p className="text-[11px] text-slate-400">SQLite audit trail and analysis logs</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Database Driver:</span>
              <span className="font-semibold text-slate-800">SQLite 3 (Local persistent storage)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Target Path:</span>
              <span className="font-mono text-slate-800">backend/data/analysis_history.db</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Security Boundary:</span>
              <span className="font-semibold text-slate-800">Static features only (No binaries stored)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleSeed}
              className="py-2.5 rounded-xl border border-slate-200 hover:border-brand-300 bg-slate-50 hover:bg-white active:scale-[0.98] text-xs font-bold text-slate-700 transition-all"
            >
              Seed Benchmark Records
            </button>
            <button
              onClick={handleClear}
              className="py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 active:scale-[0.98] text-xs font-bold text-rose-600 transition-all"
            >
              Wipe Database
            </button>
          </div>
        </div>
      </div>

      {/* Game Theory Presets */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Game-Theoretic Defensive Profiles (Presets)</h3>
          <p className="text-[11px] text-slate-400">Pre-calibrated risk weighting profiles for specialized environments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2 hover:border-brand-300 hover:shadow-sm transition-all">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Preset A</span>
            <h4 className="font-extrabold text-slate-900">Critical Infrastructure</h4>
            <p className="text-slate-600 text-[11px]">
              Impact = 95, Missed Detection = 2.5x, FP Disruption = 25. Maximizes blocking and containment.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 hover:border-brand-200 hover:shadow-sm transition-all">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preset B</span>
            <h4 className="font-extrabold text-slate-900">Corporate Enterprise</h4>
            <p className="text-slate-600 text-[11px]">
              Impact = 70, Missed Detection = 1.5x, FP Disruption = 55. Balances deep inspection to preserve availability.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 hover:border-brand-200 hover:shadow-sm transition-all">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preset C</span>
            <h4 className="font-extrabold text-slate-900">Developer Sandbox</h4>
            <p className="text-slate-600 text-[11px]">
              Impact = 40, Missed Detection = 1.0x, FP Disruption = 80. Favors passive monitoring to avoid developer friction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
