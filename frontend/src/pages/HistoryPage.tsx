import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Clock,
  X,
  Database,
  Download,
} from 'lucide-react';
import { fetchHistory, clearHistoryRecords, seedDemoData } from '../services/api';
import { AnalysisRecord } from '../types';

interface HistoryPageProps {
  selectedRecordFromParent?: AnalysisRecord | null;
  onClearSelectedRecord?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  selectedRecordFromParent,
  onClearSelectedRecord,
}) => {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeDetail, setActiveDetail] = useState<AnalysisRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory(50, 0, search, classificationFilter, actionFilter);
      setRecords(data.records);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, classificationFilter, actionFilter]);

  useEffect(() => {
    if (selectedRecordFromParent) {
      setActiveDetail(selectedRecordFromParent);
    }
  }, [selectedRecordFromParent]);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all historical analysis records?')) {
      await clearHistoryRecords();
      await loadData();
    }
  };

  const handleSeed = async () => {
    await seedDemoData();
    await loadData();
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analysis Audit History</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Persisted records in SQLite of past static classifications and game-theoretic decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm active:scale-[0.98] text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Database className="w-3.5 h-3.5 text-brand-600" />
            <span>Seed Samples</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-rose-200 hover:bg-rose-50 hover:shadow-sm active:scale-[0.98] text-xs font-bold text-rose-600 shadow-sm transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-subtle flex flex-col md:flex-row gap-4 items-center justify-between interactive-card">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Sample ID or name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">Classification:</span>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none hover:border-slate-300 transition-colors"
            >
              <option value="All">All Types</option>
              <option value="Malicious">Malicious</option>
              <option value="Benign">Benign</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none hover:border-slate-300 transition-colors"
            >
              <option value="All">All Actions</option>
              <option value="Block">Block</option>
              <option value="Contain">Contain</option>
              <option value="Deep Inspection">Deep Inspection</option>
              <option value="Monitor">Monitor</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-subtle interactive-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-4">Sample ID & Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Threat Prob P(M)</th>
                <th className="py-3 px-4">Defensive Action</th>
                <th className="py-3 px-4">Expected Utility</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No historical analysis records found matching your filters.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const isMal = rec.classification === 'Malicious';
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 block">{rec.sample_id}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {rec.sample_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td className="py-3 px-4 font-mono font-semibold">
                        {(rec.malware_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border ${getActionBadgeColor(
                            rec.selected_action
                          )}`}
                        >
                          {rec.selected_action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-600">
                        {rec.expected_utility}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(rec.created_at || '').toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setActiveDetail(rec)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 font-bold transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Inspection Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-6 shadow-card animate-page-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {activeDetail.sample_id}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activeDetail.sample_name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveDetail(null);
                  if (onClearSelectedRecord) onClearSelectedRecord();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Classification</span>
                <p className="font-bold text-slate-800 mt-1">{activeDetail.classification}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Probability P(M)</span>
                <p className="font-bold text-slate-800 mt-1">{(activeDetail.malware_probability * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <span className="text-[10px] font-bold text-brand-600 block uppercase">Selected Action</span>
                <p className="font-black text-brand-700 mt-1">{activeDetail.selected_action}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Model Version</span>
                <p className="font-bold text-slate-800 mt-1">{activeDetail.model_version}</p>
              </div>
            </div>

            {/* Raw Features Table */}
            {activeDetail.features && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Extracted Static Features
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-4 rounded-2xl">
                  {Object.entries(activeDetail.features).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-200/40 pb-1">
                      <span className="text-slate-500">{k}:</span>
                      <span className="font-bold text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game theory explanation */}
            {activeDetail.game_theory?.explanation && (
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs">
                <strong className="text-brand-900 block font-semibold mb-1">Game-Theoretic Decision Rationale:</strong>
                <p className="text-slate-700">{activeDetail.game_theory.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
