import React from 'react';
import {
  ShieldAlert,
  Binary,
  Layers,
  Terminal,
  Cpu,
  BookOpen,
  CheckCircle,
  FileText,
  AlertOctagon,
} from 'lucide-react';

export const ThreatIntelligencePage: React.FC = () => {
  const attackerProfiles = [
    {
      title: 'Low-Profile Strategic Behavior',
      tag: 'APT & Living-off-the-Land',
      color: 'border-slate-300 bg-slate-50',
      badge: 'Stealthy Persistence',
      description:
        'Tactics designed to evade passive security monitors by mimicking authentic Windows background services, abusing signed system binaries (LOLBins), and utilizing native API calls without packing.',
      mitre: ['T1059.001 (PowerShell)', 'T1547.001 (Registry Run Keys)', 'T1055 (Process Injection)'],
      defenderCounter: 'Deep inspection and memory anomaly tracing unmask stealth hooks effectively.',
    },
    {
      title: 'Suspicious Strategic Behavior',
      tag: 'Direct Ransomware & Trojans',
      color: 'border-amber-200 bg-amber-50/40',
      badge: 'Loud Execution',
      description:
        'Direct unauthorized actions including rapid file encryption, volume shadow copies deletion, mass network beaconing, and aggressive privilege escalation.',
      mitre: ['T1486 (Data Encrypted for Impact)', 'T1490 (Inhibit System Recovery)', 'T1071 (Application Layer Protocol)'],
      defenderCounter: 'Containment sandboxes immediately arrest lateral spread and file modifications.',
    },
    {
      title: 'Evasive Strategic Behavior',
      tag: 'Packers, Crypters & Anti-Analysis',
      color: 'border-rose-200 bg-rose-50/40',
      badge: 'Defensive Countermeasures',
      description:
        'Advanced malware variants utilizing custom packers, high Shannon entropy sections (>7.2), TLS execution callbacks, anti-debugging routines, and delayed sleep triggers to defeat standard heuristic scanners.',
      mitre: ['T1027.002 (Software Packing)', 'T1497 (Virtualization/Sandbox Evasion)', 'T1622 (Debugger Evasion)'],
      defenderCounter: 'Pre-execution block or deep forensic unpacking are required to neutralize evasion.',
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Threat Intelligence & Strategic Modeling
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Formal academic formulation, attacker strategy taxonomy, and mathematical foundations of adaptive defense.
        </p>
      </div>

      {/* Attacker Strategy Profiles */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Abstract Attacker Strategy Taxonomy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {attackerProfiles.map((p, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 border ${p.color} shadow-subtle flex flex-col justify-between space-y-4 interactive-card`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {p.tag}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-sm">
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{p.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {p.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    MITRE ATT&CK Techniques:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.mitre.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="px-2 py-0.5 rounded-md bg-white/80 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200 hover:border-brand-300 hover:text-brand-700 transition-colors"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70 text-[11px] text-slate-600">
                  <strong className="text-slate-900 font-semibold">Optimal Counter:</strong> {p.defenderCounter}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mathematical Formulation Section */}
      <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-subtle space-y-6 interactive-card">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Mathematical Utility Formulation
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Academic Game Theory Formulation: Non-Zero-Sum Incomplete Information Security Game
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">1. Defender Utility Function</h3>
            <p className="text-slate-600">
              Given a candidate executable, the Machine Learning classifier outputs an estimated malware probability{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-brand-600 font-bold">p = P(M)</code>.
              The overall expected security payoff for choosing defensive action <code className="font-mono">D_i</code> against
              attacker strategy <code className="font-mono">A_j</code> is structured as:
            </p>
            <div className="p-4 bg-slate-900 text-purple-200 rounded-2xl font-mono text-[11px] space-y-2">
              <p>U_D(D_i, A_j) = p * U_malicious(D_i, A_j) + (1 - p) * U_benign(D_i)</p>
              <p className="text-slate-400">Where:</p>
              <p>U_malicious(D_i, A_j) = (2 * E(D_i, A_j) - 1) * (Impact * C_MD) - C(D_i)</p>
              <p>U_benign(D_i) = - [C(D_i) + Disruption(D_i) * C_FP]</p>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong className="text-slate-800">E(D_i, A_j):</strong> Mitigation effectiveness of action D_i against attacker tactic A_j.</li>
              <li><strong className="text-slate-800">C_MD:</strong> Multiplier penalty for unmitigated breach damage.</li>
              <li><strong className="text-slate-800">C_FP:</strong> Operational penalty for interrupting legitimate software execution.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">2. Decision Optimization Methods</h3>
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Method A: Expected Utility Maximization</h4>
                <p className="text-slate-500 text-[11px] mt-1 font-mono">
                  D* = argmax_(D_i) sum_j q_j * U_D(D_i, A_j)
                </p>
                <p className="text-slate-600 text-[11px] mt-1">
                  Maximizes weighted average utility under prior attacker behavior distribution beliefs <code>q</code>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Method B: Minimax (Robust Defense)</h4>
                <p className="text-slate-500 text-[11px] mt-1 font-mono">
                  D*_minimax = argmax_(D_i) min_(A_j) U_D(D_i, A_j)
                </p>
                <p className="text-slate-600 text-[11px] mt-1">
                  Protects the enterprise against worst-case adversarial evasion, guaranteeing maximum floor payoff.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Method C: Mixed-Strategy Nash Equilibrium</h4>
                <p className="text-slate-600 text-[11px] mt-1">
                  Solves for randomized defense allocations using Linear Programming, preventing intelligent adversaries from predicting security actions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
