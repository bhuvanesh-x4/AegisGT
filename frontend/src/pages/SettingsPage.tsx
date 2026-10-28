import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
  Check,
} from 'lucide-react';
import {
  triggerModelTrain,
  clearHistoryRecords,
  seedDemoData,
} from '../services/api';

export const SettingsPage: React.FC = () => {
  const [retraining, setRetraining] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleRetrain = async () => {
    setRetraining(true);
    setStatusMsg(null);
    try {
      await triggerModelTrain();
      setStatusMsg('Model parameters and artifacts verified successfully.');
    } catch (err: any) {
      setStatusMsg(`Verification failed: ${err.message}`);
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
    if (window.confirm('Clear all local analysis history?')) {
      try {
        const res = await clearHistoryRecords();
        setStatusMsg(res.message);
      } catch (err: any) {
        setStatusMsg(`Failed to clear: ${err.message}`);
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Settings & Configuration</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Model persistence configuration, strategic defense presets, and database administration.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 bg-purple-50 border border-brand-200 rounded-2xl text-xs font-semibold text-brand-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

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
