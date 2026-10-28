import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { fetchAnalyticsMetrics, triggerModelTrain } from '../services/api';
import { EvaluationAnalytics } from '../types';

export const PerformanceAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<EvaluationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchAnalyticsMetrics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await triggerModelTrain();
      await loadMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Evaluation Benchmarks...</p>
        </div>
      </div>
    );
  }

  const { metrics, confusion_matrix, feature_importances, roc_curve, policy_comparison } =
    analytics;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Performance Analytics & Policy Benchmarking
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Empirical validation of Random Forest static classifier and comparative game-theoretic policy evaluation.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm active:scale-[0.98] text-xs font-bold text-slate-700 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${retraining ? 'animate-spin' : ''}`} />
          <span>{retraining ? 'Retraining Model...' : 'Retrain Classifier'}</span>
        </button>
      </div>

      {/* Primary Classification Metric Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{(metrics.accuracy * 100).toFixed(1)}%</p>
          <span className="text-[10px] font-semibold text-emerald-600">Empirical Test</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precision</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{(metrics.precision * 100).toFixed(1)}%</p>
          <span className="text-[10px] font-semibold text-slate-400">True Positives</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recall</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{(metrics.recall * 100).toFixed(1)}%</p>
          <span className="text-[10px] font-semibold text-slate-400">Detection Rate</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">F1-Score</span>
          <p className="text-2xl font-black text-brand-600 mt-1">{(metrics.f1_score * 100).toFixed(1)}%</p>
          <span className="text-[10px] font-semibold text-purple-400">Harmonic Mean</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ROC-AUC</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.roc_auc.toFixed(3)}</p>
          <span className="text-[10px] font-semibold text-emerald-600">Discriminative Power</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Latency</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.avg_latency_ms} <span className="text-xs font-normal">ms</span></p>
          <span className="text-[10px] font-semibold text-slate-400">Per sample inference</span>
        </div>
      </section>

      {/* Row 2: Confusion Matrix & ROC Curve */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Confusion Matrix (Test Evaluation Split)</h3>
              <p className="text-[11px] text-slate-400">Tested on 300 unseen hold-out samples</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              FPR: {(metrics.false_positive_rate * 100).toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                True Negatives (TN)
              </span>
              <p className="text-3xl font-black text-emerald-800 mt-1">{confusion_matrix.true_negative}</p>
              <span className="text-[10px] font-semibold text-emerald-600">Benign verified correctly</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                False Positives (FP)
              </span>
              <p className="text-3xl font-black text-rose-800 mt-1">{confusion_matrix.false_positive}</p>
              <span className="text-[10px] font-semibold text-rose-600">Benign flagged as malware</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                False Negatives (FN)
              </span>
              <p className="text-3xl font-black text-amber-800 mt-1">{confusion_matrix.false_negative}</p>
              <span className="text-[10px] font-semibold text-amber-600">Malware missed</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block">
                True Positives (TP)
              </span>
              <p className="text-3xl font-black text-brand-800 mt-1">{confusion_matrix.true_positive}</p>
              <span className="text-[10px] font-semibold text-brand-600">Malware intercepted</span>
            </div>
          </div>
        </div>

        {/* Empirical ROC Curve */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Receiver Operating Characteristic (ROC)</h3>
              <p className="text-[11px] text-slate-400">Area Under Curve (AUC) = {metrics.roc_auc.toFixed(3)}</p>
            </div>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={roc_curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="fpr"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickFormatter={(v) => v.toFixed(2)}
                  tickLine={false}
                />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '0.75rem',
                    border: 'none',
                    fontSize: '12px',
                    color: '#FFF',
                  }}
                  formatter={(val: any) => [`${val}`, 'TPR']}
                  labelFormatter={(l: any) => `FPR: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="tpr"
                  stroke="#7047EB"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row 3: Top Feature Importances */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Top Static Feature Importances (Gini Impurity)</h3>
          <p className="text-[11px] text-slate-400">Contribution of structural indicators to malware detection</p>
        </div>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={feature_importances.slice(0, 8)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="feature"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  borderRadius: '0.75rem',
                  border: 'none',
                  fontSize: '12px',
                  color: '#FFF',
                }}
              />
              <Bar
                dataKey="importance"
                fill="#7047EB"
                radius={[0, 6, 6, 0]}
                isAnimationActive={true}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Row 4: Defensive Policy Benchmarking Table */}
      <section className="bg-white rounded-3xl p-6 border border-purple-100/70 shadow-subtle space-y-4 interactive-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Comparative Defensive Policy Evaluation
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Simulation of defensive decision rules across the evaluated test dataset under identical threat assumptions.
            </p>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 bg-brand-50 text-brand-700 rounded-full border border-brand-200">
            300 Evaluated Samples
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-3">Defense Policy</th>
                <th className="py-3 px-3">Average Expected Utility</th>
                <th className="py-3 px-3">False Interruption Rate</th>
                <th className="py-3 px-3">Missed Attacks</th>
                <th className="py-3 px-3">Action Distribution (Block / Contain / Inspect / Monitor)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {policy_comparison.map((pol, idx) => {
                const isProposed = pol.policy_key === 'game_theoretic_eu';
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isProposed ? 'bg-purple-50/40 font-bold' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        {isProposed && <Award className="w-4 h-4 text-brand-600 shrink-0" />}
                        <div>
                          <p className="text-slate-900 font-bold">{pol.policy_name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{pol.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`text-sm font-black ${isProposed ? 'text-brand-600' : 'text-slate-800'}`}>
                        {pol.avg_expected_utility}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-semibold">
                      {pol.false_interruption_rate}%
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`font-mono font-bold ${pol.missed_attacks_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {pol.missed_attacks_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                      {pol.action_breakdown.Block} / {pol.action_breakdown.Contain} / {pol.action_breakdown['Deep Inspection']} / {pol.action_breakdown.Monitor}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
