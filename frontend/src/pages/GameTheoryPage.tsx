import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  ShieldCheck,
  RotateCcw,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { simulateGameTheory, fetchSensitivityCurve } from '../services/api';
import { GameParameters, GameTheoryResult, SensitivityPoint } from '../types';

interface GameTheoryPageProps {
  initialProbability?: number;
  sampleId?: string;
}

export const GameTheoryPage: React.FC<GameTheoryPageProps> = ({
  initialProbability = 0.5,
  sampleId,
}) => {
  const [method, setMethod] = useState<'expected_utility' | 'minimax' | 'nash_equilibrium'>(
    'expected_utility'
  );

  const [params, setParams] = useState<GameParameters>({
    malware_probability: initialProbability,
    potential_impact: 75.0,
    cost_missed_detection: 1.8,
    cost_false_positive: 45.0,
    cost_monitor: 5.0,
    cost_inspection: 22.0,
    cost_contain: 45.0,
    cost_block: 60.0,
    attacker_prob_low_profile: 0.25,
    attacker_prob_suspicious: 0.45,
    attacker_prob_evasive: 0.30,
  });

  const [result, setResult] = useState<GameTheoryResult | null>(null);
  const [sensitivityCurve, setSensitivityCurve] = useState<SensitivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionPulse, setDecisionPulse] = useState(false);

  // Recalculate game dynamically
  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await simulateGameTheory(params, method);
      setResult(res);
      // Trigger a brief micro-pulse animation on calculation
      setDecisionPulse(true);
      setTimeout(() => setDecisionPulse(false), 500);

      const sensRes = await fetchSensitivityCurve(
        params.potential_impact,
        params.cost_false_positive,
        params.cost_missed_detection,
        30
      );
      setSensitivityCurve(sensRes.sensitivity_curve);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params, method]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const updateParam = (key: keyof GameParameters, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const resetDefaults = () => {
    setParams({
      malware_probability: 0.5,
      potential_impact: 75.0,
      cost_missed_detection: 1.8,
      cost_false_positive: 45.0,
      cost_monitor: 5.0,
      cost_inspection: 22.0,
      cost_contain: 45.0,
      cost_block: 60.0,
      attacker_prob_low_profile: 0.25,
      attacker_prob_suspicious: 0.45,
      attacker_prob_evasive: 0.30,
    });
    setMethod('expected_utility');
  };

  // Bar chart data for utilities
  const euChartData = result
    ? Object.entries(result.expected_utilities).map(([action, utility]) => ({
        action,
        utility,
        isOptimal: action === result.selected_action,
      }))
    : [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Game Theory Defense Engine
            </h1>
            {sampleId && (
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-bold shadow-sm animate-pulse">
                Linked Sample: {sampleId}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Solve asymmetric attacker-defender non-zero-sum game matrices using expected utility, minimax, and Nash equilibria.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-purple-300 text-xs font-bold text-slate-600 shadow-sm transition-all duration-200 hover:text-brand-600 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-90" />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Parameter Configuration Sliders (4 cols) */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-6 interactive-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Game Parameters
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Dynamic Solvers</span>
          </div>

          {/* Decision Method Tabs with smooth transition */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-2">
              Decision Optimization Method:
            </label>
            <div className="flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/50">
              <button
                onClick={() => setMethod('expected_utility')}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                  method === 'expected_utility'
                    ? 'bg-brand-600 text-white shadow-purple-glow ring-1 ring-purple-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                Expected Utility
              </button>
              <button
                onClick={() => setMethod('minimax')}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                  method === 'minimax'
                    ? 'bg-brand-600 text-white shadow-purple-glow ring-1 ring-purple-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                Minimax
              </button>
              <button
                onClick={() => setMethod('nash_equilibrium')}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                  method === 'nash_equilibrium'
                    ? 'bg-brand-600 text-white shadow-purple-glow ring-1 ring-purple-400/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                Nash Eq.
              </button>
            </div>
          </div>

          {/* Probability Slider with responsive track */}
          <div className="space-y-1 group">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700">Estimated Malware Prob P(M):</span>
              <span className="font-mono font-black text-brand-600 px-2 py-0.5 bg-brand-50 rounded-md border border-brand-100">
                {(params.malware_probability * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={params.malware_probability}
              onChange={(e) => updateParam('malware_probability', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">Class probability provided by ML classifier</p>
          </div>

          {/* Asset Impact */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700">Potential Incident Impact (I):</span>
              <span className="font-mono font-black text-slate-900">{params.potential_impact}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={params.potential_impact}
              onChange={(e) => updateParam('potential_impact', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          {/* False Positive Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700">False Positive Disruption (C_FP):</span>
              <span className="font-mono font-black text-slate-900">{params.cost_false_positive}</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={params.cost_false_positive}
              onChange={(e) => updateParam('cost_false_positive', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">Cost when benign binary is blocked or contained</p>
          </div>

          {/* Missed Detection Multiplier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-700">Missed Detection Weight (C_MD):</span>
              <span className="font-mono font-black text-slate-900">{params.cost_missed_detection}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={params.cost_missed_detection}
              onChange={(e) => updateParam('cost_missed_detection', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Attacker Strategy Beliefs */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Attacker Strategy Prior Beliefs
            </h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Low-Profile (Stealth):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Math.round(params.attacker_prob_low_profile * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={params.attacker_prob_low_profile}
                  onChange={(e) => updateParam('attacker_prob_low_profile', parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Suspicious (Standard):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Math.round(params.attacker_prob_suspicious * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={params.attacker_prob_suspicious}
                  onChange={(e) => updateParam('attacker_prob_suspicious', parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Evasive (Anti-Analysis):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Math.round(params.attacker_prob_evasive * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={params.attacker_prob_evasive}
                  onChange={(e) => updateParam('attacker_prob_evasive', parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Game Results & Payoffs (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Decision Outcome Card with Refined Micro-Pulse */}
          {result && (
            <div
              className={`bg-white/95 backdrop-blur-sm rounded-3xl p-6 border transition-all duration-300 shadow-subtle space-y-4 ${
                decisionPulse
                  ? 'border-brand-500 shadow-purple-glow ring-2 ring-brand-500/20'
                  : 'border-purple-100 hover:border-purple-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-purple-glow transition-transform duration-300 ${decisionPulse ? 'scale-110 rotate-3' : ''}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-500" />
                      Optimal Strategy Recommendation
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {result.selected_action}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Expected Utility
                  </span>
                  <span className="text-2xl font-black text-brand-600">
                    {result.expected_utility}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-start gap-3 transition-colors">
                <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {result.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Payoff Matrix Heatmap Table */}
          {result && (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Defender Payoff Matrix U_D(D_i, A_j)</h3>
                  <p className="text-[11px] text-slate-400">
                    Net utility computed across attacker strategic moves
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 bg-purple-50 text-brand-700 font-bold rounded-full border border-purple-100">
                  Dynamic Payoffs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 text-left">Defender Strategy</th>
                      <th className="py-2.5 px-3">Low-profile ({((result.attacker_beliefs['Low-profile'] || 0) * 100).toFixed(0)}%)</th>
                      <th className="py-2.5 px-3">Suspicious ({((result.attacker_beliefs['Suspicious'] || 0) * 100).toFixed(0)}%)</th>
                      <th className="py-2.5 px-3">Evasive ({((result.attacker_beliefs['Evasive'] || 0) * 100).toFixed(0)}%)</th>
                      <th className="py-2.5 px-3 font-black text-brand-600 bg-brand-50/50 rounded-t-xl">
                        Expected Utility
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-slate-700">Minimax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono">
                    {result.payoff_table.map((row, idx) => {
                      const isChosen = row.defender_strategy === result.selected_action;
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors duration-200 ${
                            isChosen
                              ? 'bg-purple-50/60 font-bold border-l-4 border-brand-600'
                              : 'hover:bg-slate-50/60 border-l-4 border-transparent'
                          }`}
                        >
                          <td className="py-3 px-3 text-left font-sans font-bold text-slate-800 flex items-center gap-1.5">
                            {isChosen && (
                              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                            )}
                            <span>{row.defender_strategy}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={row.low_profile >= 0 ? 'text-slate-800' : 'text-rose-600'}>
                              {row.low_profile}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={row.suspicious >= 0 ? 'text-slate-800' : 'text-rose-600'}>
                              {row.suspicious}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={row.evasive >= 0 ? 'text-slate-800' : 'text-rose-600'}>
                              {row.evasive}
                            </span>
                          </td>
                          <td className="py-3 px-3 bg-brand-50/50 font-black text-brand-700">
                            {row.expected_utility}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-semibold">
                            {row.worst_case_utility}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expected Utilities Bar Chart with smooth animation */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expected Utility Comparison</h3>
              <p className="text-[11px] text-slate-400">
                Strategic utility comparison for each defensive alternative
              </p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={euChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="action" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '0.75rem',
                      border: 'none',
                      fontSize: '12px',
                      color: '#FFF',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    }}
                  />
                  <Bar
                    dataKey="utility"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {euChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isOptimal ? '#7047EB' : '#CBD5E1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sensitivity Analysis Multi-Line Curve with smooth animation */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 shadow-subtle space-y-4 interactive-card">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sensitivity Analysis Across Malware Probability P(M)
              </h3>
              <p className="text-[11px] text-slate-400">
                Exhibits strategic crossover points where optimal action transitions as threat confidence scales
              </p>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={sensitivityCurve} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="malware_probability"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
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
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    }}
                    formatter={(val: any) => [`${val}`, 'Utility']}
                    labelFormatter={(label: any) => `P(Malware): ${(label * 100).toFixed(0)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Monitor" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={700} />
                  <Line type="monotone" dataKey="Deep Inspection" stroke="#7047EB" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={700} />
                  <Line type="monotone" dataKey="Contain" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={700} />
                  <Line type="monotone" dataKey="Block" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={700} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
