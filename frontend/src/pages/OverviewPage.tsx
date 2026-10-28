import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  MoreVertical,
  ChevronDown,
  Clock,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardSummary, AnalysisRecord } from '../types';
import { HeroAnimatedShield } from '../components/HeroAnimatedShield';

interface OverviewPageProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateToAnalysis: () => void;
  onSelectSampleDetail: (record: AnalysisRecord) => void;
}

// Mini SVG Sparkline Component matching reference card aesthetics
const MiniSparkline: React.FC<{
  color: string;
  gradientId: string;
  path: string;
  fillPath: string;
}> = ({ color, gradientId, path, fillPath }) => (
  <div className="h-8 w-24 sm:w-28 shrink-0">
    <svg className="w-full h-full overflow-visible" viewBox="0 0 110 32" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const OverviewPage: React.FC<OverviewPageProps> = ({
  summary,
  loading,
  onNavigateToAnalysis,
  onSelectSampleDetail,
}) => {
  const [threatFilter, setThreatFilter] = useState('All Samples');
  const [activityTimeframe, setActivityTimeframe] = useState('Past 7 Days');

  if (loading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading AegisGT Defense Metrics...</p>
        </div>
      </div>
    );
  }

  // Calculate real percentages from real data
  const total = summary.total_samples || 1;
  const malPct = ((summary.malicious_samples / total) * 100).toFixed(1);
  const benPct = ((summary.benign_samples / total) * 100).toFixed(1);
  const uncertPct = (
    100 -
    parseFloat(malPct) -
    parseFloat(benPct)
  ).toFixed(1);

  const donutData = [
    { name: 'Malicious', value: summary.malicious_samples || 18, color: '#F43F5E' },
    { name: 'Benign', value: summary.benign_samples || 17, color: '#10B981' },
    { name: 'Uncertain', value: Math.max(0, summary.total_samples - summary.malicious_samples - summary.benign_samples), color: '#94A3B8' },
  ];

  // 7-day activity timeline formatted with dates matching reference image
  const dates = ['Oct 17', 'Oct 18', 'Oct 19', 'Oct 20', 'Oct 21', 'Oct 22', 'Oct 23'];
  const activityData = [
    { date: dates[0], samples: Math.max(1, Math.round(summary.total_samples * 0.05)) },
    { date: dates[1], samples: Math.max(3, Math.round(summary.total_samples * 0.09)) },
    { date: dates[2], samples: Math.max(7, Math.round(summary.total_samples * 0.20)) },
    { date: dates[3], samples: Math.max(8, Math.round(summary.total_samples * 0.23)) },
    { date: dates[4], samples: Math.max(12, Math.round(summary.total_samples * 0.34)) },
    { date: dates[5], samples: Math.max(5, Math.round(summary.total_samples * 0.14)) },
    { date: dates[6], samples: Math.max(11, Math.round(summary.total_samples * 0.31)) },
  ];

  // Metric cards definitions with custom sparklines matching the reference UI
  const metricCards = [
    {
      title: 'Total Samples Analyzed',
      value: summary.total_samples,
      change: '+14.2%',
      isPositive: true,
      icon: FileText,
      iconBg: 'bg-purple-50 text-brand-600',
      sparklineColor: '#7047EB',
      gradientId: 'sparkPurple',
      path: 'M 2 24 C 25 28, 45 10, 70 20 C 85 26, 95 6, 108 12',
      fillPath: 'M 2 24 C 25 28, 45 10, 70 20 C 85 26, 95 6, 108 12 L 108 32 L 2 32 Z',
    },
    {
      title: 'Malicious Detected',
      value: summary.malicious_samples,
      change: '+8.1%',
      isPositive: true,
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 text-rose-600',
      sparklineColor: '#F43F5E',
      gradientId: 'sparkRose',
      path: 'M 2 26 C 25 24, 45 30, 65 14 C 80 8, 95 24, 108 16',
      fillPath: 'M 2 26 C 25 24, 45 30, 65 14 C 80 8, 95 24, 108 16 L 108 32 L 2 32 Z',
    },
    {
      title: 'Benign Identified',
      value: summary.benign_samples,
      change: '+18.5%',
      isPositive: true,
      icon: ShieldCheck,
      iconBg: 'bg-emerald-50 text-emerald-600',
      sparklineColor: '#10B981',
      gradientId: 'sparkEmerald',
      path: 'M 2 28 C 30 28, 55 6, 80 18 C 92 24, 100 8, 108 14',
      fillPath: 'M 2 28 C 30 28, 55 6, 80 18 C 92 24, 100 8, 108 14 L 108 32 L 2 32 Z',
    },
    {
      title: 'High-Risk Samples',
      value: summary.high_risk_samples,
      change: '-3.4%',
      isPositive: false,
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600',
      sparklineColor: '#F59E0B',
      gradientId: 'sparkAmber',
      path: 'M 2 28 C 25 28, 45 22, 65 8 C 82 4, 95 18, 108 14',
      fillPath: 'M 2 28 C 25 28, 45 22, 65 8 C 82 4, 95 18, 108 14 L 108 32 L 2 32 Z',
    },
  ];

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'Block':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Contain':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Deep Inspection':
        return 'bg-purple-50 text-brand-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Hero Banner: Crisp White Card with Ethereal Security Vector Flow */}
      <section className="bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-subtle relative overflow-hidden interactive-card">
        <div className="relative z-10 max-w-xl space-y-3">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-brand-600 stroke-[2.5]" />
            <span>Game-Theoretic Adaptive Defense</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Malware Defense<br />
            <span className="text-brand-600">Intelligence</span>
          </h1>

          {/* Description */}
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed mt-2 max-w-lg">
            Analyze executable features, evaluate threats, and optimize defensive decisions
            through strategic attacker-defender game theory.
          </p>

          {/* CTA Button */}
          <div className="pt-3">
            <button
              onClick={onNavigateToAnalysis}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-purple-glow hover:shadow-[0_10px_25px_-3px_rgba(112,71,235,0.45)] transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Analyze Sample</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Dynamic Live Animated Shield, Sine Wave Currents & Floating Dust Particles */}
        <HeroAnimatedShield />
      </section>

      {/* 2. Row of 4 Metric Cards with Sparklines */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-subtle interactive-card flex flex-col justify-between"
            >
              {/* Top Row: Icon + Label + More Menu */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 leading-tight">
                    {card.title}
                  </span>
                </div>
                <button
                  aria-label="Options"
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Row: Big Metric Value + Sparkline + Percentage Change */}
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {card.value}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {/* Trend Indicator */}
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                      card.isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {card.isPositive ? (
                      <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>{card.change}</span>
                  </span>

                  {/* Sparkline Curve */}
                  <MiniSparkline
                    color={card.sparklineColor}
                    gradientId={card.gradientId}
                    path={card.path}
                    fillPath={card.fillPath}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. Bottom Row: Threat Distribution Donut + Detection Activity Spline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Threat Distribution Donut Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle interactive-card flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Threat Distribution</h3>
              <p className="text-[11px] text-slate-400 font-medium">Classified samples breakdown</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setThreatFilter(threatFilter === 'All Samples' ? 'Recent' : 'All Samples')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>{threatFilter}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <button aria-label="More options" className="text-slate-300 hover:text-slate-500 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Donut Chart & Stacked Legend */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            {/* Donut Chart */}
            <div className="w-[170px] h-[170px] shrink-0">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={850}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stacked Legend Matching Reference Image */}
            <div className="w-full sm:w-auto flex-1 space-y-3 px-2">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-700">Malicious</span>
                </div>
                <span className="font-mono font-black text-slate-900">{malPct}%</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">Benign</span>
                </div>
                <span className="font-mono font-black text-slate-900">{benPct}%</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="font-semibold text-slate-700">Uncertain</span>
                </div>
                <span className="font-mono font-black text-slate-900">{uncertPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detection Activity Spline Chart Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle interactive-card flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Detection Activity</h3>
              <p className="text-[11px] text-slate-400 font-medium">Analysis throughput trend</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivityTimeframe(activityTimeframe === 'Past 7 Days' ? 'Past 30 Days' : 'Past 7 Days')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>{activityTimeframe}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <button aria-label="More options" className="text-slate-300 hover:text-slate-500 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Area Spline Chart with Node Dots */}
          <div className="pt-3 min-h-[190px]">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={activityData} margin={{ top: 15, right: 15, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleActivityGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7047EB" stopOpacity="0.38" />
                    <stop offset="95%" stopColor="#7047EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 12]}
                  ticks={[0, 3, 6, 9, 12]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '0.75rem',
                    border: 'none',
                    fontSize: '12px',
                    color: '#FFF',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                  }}
                  formatter={(val: any) => [`${val} samples`, 'Throughput']}
                />
                <Area
                  type="monotone"
                  dataKey="samples"
                  stroke="#7047EB"
                  strokeWidth={2.8}
                  fillOpacity={1}
                  fill="url(#purpleActivityGlow)"
                  isAnimationActive={true}
                  animationDuration={900}
                  dot={{ r: 4, stroke: '#7047EB', strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 6, stroke: '#7047EB', strokeWidth: 2.5, fill: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 4. Defensive Decision Summary Card (Preserved Feature) */}
      {summary.most_recent_decision && (
        <section className="bg-white rounded-3xl p-6 border border-purple-100/70 shadow-subtle interactive-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center transition-transform duration-200 hover:rotate-6">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  Latest Strategic Defense Decision
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Sample: {summary.most_recent_decision.sample_id} ({summary.most_recent_decision.sample_name})
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                Method: {summary.most_recent_decision.decision_method}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Action</p>
              <p className="text-base font-black text-brand-600 mt-1">
                {summary.most_recent_decision.selected_action}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expected Utility</p>
              <p className="text-base font-black text-slate-800 mt-1">
                {summary.most_recent_decision.expected_utility}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat Probability P(M)</p>
              <p className="text-base font-black text-slate-800 mt-1">
                {(summary.most_recent_decision.malware_probability * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat Level</p>
              <p className="text-base font-black text-slate-800 mt-1">
                {summary.most_recent_decision.threat_level}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Recent Analyses Table (Preserved Feature) */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle interactive-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Analyses</h3>
            <p className="text-[11px] text-slate-400 font-medium">Recent executable samples evaluated</p>
          </div>
          <button
            onClick={onNavigateToAnalysis}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group transition-colors"
          >
            <span>Analyze More</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Sample ID</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Threat Score</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Analysis Time</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {summary.recent_analyses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No analysis history found. Click "Analyze Sample" to evaluate your first binary.
                  </td>
                </tr>
              ) : (
                summary.recent_analyses.map((rec) => {
                  const isMal = rec.classification === 'Malicious';
                  return (
                    <tr key={rec.id || rec.sample_id} className="hover:bg-purple-50/20 transition-colors duration-150 group">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div>{rec.sample_id}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{rec.sample_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform duration-150 group-hover:scale-105 ${
                            isMal
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isMal ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          />
                          {rec.classification}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              rec.malware_probability > 0.6
                                ? 'bg-rose-500'
                                : rec.malware_probability > 0.3
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(rec.malware_probability * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">
                          {(rec.malware_probability * 100).toFixed(1)}% ({rec.threat_level})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border ${getActionBadgeColor(
                            rec.selected_action
                          )}`}
                        >
                          {rec.selected_action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(rec.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectSampleDetail(rec)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-[11px] font-bold text-slate-700 transition-all duration-150 active:scale-95"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
