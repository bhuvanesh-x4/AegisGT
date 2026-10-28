import { AnalysisRecord, DashboardSummary } from "../types";
import benchmarkData from "../data/benchmarkSamples.json";
import { LocalModelInference } from "./modelInference";
import { GameTheoryEngineTS } from "./gameTheoryEngine";

const STORAGE_KEY = "aegisgt_analysis_records";
const COUNTER_KEY = "aegisgt_record_counter";

export class LocalDatabase {
  private static instance: LocalDatabase | null = null;

  public static getInstance(): LocalDatabase {
    if (!this.instance) {
      this.instance = new LocalDatabase();
      this.instance.ensureInitialized();
    }
    return this.instance;
  }

  private getNextId(): number {
    try {
      const current = Number(localStorage.getItem(COUNTER_KEY) || "0");
      const next = current + 1;
      localStorage.setItem(COUNTER_KEY, next.toString());
      return next;
    } catch {
      return Date.now();
    }
  }

  private getAllRecords(): AnalysisRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveAllRecords(records: AnalysisRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn("Storage quota exceeded or unavailable:", e);
    }
  }

  public ensureInitialized(): void {
    const existing = this.getAllRecords();
    if (existing.length === 0) {
      this.seedInitialData();
    }
  }

  public seedInitialData(): number {
    const inference = LocalModelInference.getInstance();
    const samples = benchmarkData as any[];
    const initialRecords: AnalysisRecord[] = [];

    for (let i = 0; i < Math.min(8, samples.length); i++) {
      const s = samples[i];
      const features = { ...s };
      delete features.sample_id;
      delete features.sample_name;
      delete features.label;

      const pred = inference.predict(features);
      const engine = new GameTheoryEngineTS({ malware_probability: pred.malware_probability });
      const gres = engine.solve();

      const record: AnalysisRecord = {
        id: this.getNextId(),
        sample_id: s.sample_id || `PE-LOCAL-${i + 1}`,
        sample_name: s.sample_name || `benchmark_sample_${i + 1}.exe`,
        file_size_kb: Number(s.file_size_kb || 64.0),
        classification: pred.classification,
        malware_probability: pred.malware_probability,
        threat_level: pred.threat_level,
        selected_action: gres.selected_action,
        decision_method: gres.decision_method,
        expected_utility: gres.expected_utility,
        features,
        metadata: { source: "Pre-seeded benchmark baseline" },
        game_theory: gres,
        model_version: pred.model_version,
        created_at: new Date(Date.now() - (8 - i) * 3600 * 1000).toISOString(),
      };
      initialRecords.push(record);
    }

    this.saveAllRecords(initialRecords);
    return initialRecords.length;
  }

  public saveRecord(recordData: Omit<AnalysisRecord, "id" | "created_at">): AnalysisRecord {
    const records = this.getAllRecords();
    const newRecord: AnalysisRecord = {
      ...recordData,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
    };
    records.unshift(newRecord); // newest first
    this.saveAllRecords(records.slice(0, 200)); // cap at 200 records
    return newRecord;
  }

  public getRecords(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    classification?: string,
    action?: string
  ): { records: AnalysisRecord[]; total: number; limit: number; offset: number } {
    let list = this.getAllRecords();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.sample_name.toLowerCase().includes(q) ||
          r.sample_id.toLowerCase().includes(q) ||
          r.decision_method.toLowerCase().includes(q)
      );
    }

    if (classification && classification !== "All") {
      list = list.filter((r) => r.classification === classification);
    }

    if (action && action !== "All") {
      list = list.filter((r) => r.selected_action === action);
    }

    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return {
      records: paginated,
      total,
      limit,
      offset,
    };
  }

  public getRecordById(id: number): AnalysisRecord | null {
    const list = this.getAllRecords();
    return list.find((r) => r.id === id) || null;
  }

  public clearRecords(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COUNTER_KEY);
    } catch {}
  }

  public getSummaryStatistics(): DashboardSummary {
    const records = this.getAllRecords();
    const totalSamples = records.length;

    let maliciousCount = 0;
    let benignCount = 0;
    let sumUtility = 0;
    let highRiskCount = 0;

    const actionCounts: Record<string, number> = {
      Monitor: 0,
      "Deep Inspection": 0,
      Contain: 0,
      Block: 0,
    };

    const threatCounts: Record<string, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };

    for (const r of records) {
      if (r.classification === "Malicious") maliciousCount++;
      else benignCount++;

      sumUtility += r.expected_utility;
      if (r.threat_level === "High" || r.threat_level === "Critical") {
        highRiskCount++;
      }

      if (r.selected_action in actionCounts) {
        actionCounts[r.selected_action]++;
      }
      if (r.threat_level in threatCounts) {
        threatCounts[r.threat_level]++;
      }
    }

    const avgUtility = totalSamples > 0 ? Number((sumUtility / totalSamples).toFixed(2)) : 0;
    const defenseScore = totalSamples > 0 ? Math.min(99.4, Number((85 + avgUtility * 0.5).toFixed(1))) : 92.5;

    const THREAT_COLORS: Record<string, string> = {
      Low: "#10B981",
      Medium: "#F59E0B",
      High: "#EF4444",
      Critical: "#7F1D1D",
    };

    const threatDistribution = Object.entries(threatCounts).map(([name, count]) => ({
      name,
      count,
      color: THREAT_COLORS[name] || "#6B7280",
    }));

    const mostRecent = records.length > 0 ? {
      sample_id: records[0].sample_id,
      sample_name: records[0].sample_name,
      selected_action: records[0].selected_action,
      decision_method: records[0].decision_method,
      expected_utility: records[0].expected_utility,
      threat_level: records[0].threat_level,
      malware_probability: records[0].malware_probability,
      timestamp: records[0].created_at || new Date().toISOString(),
    } : null;

    return {
      total_samples: totalSamples,
      malicious_samples: maliciousCount,
      benign_samples: benignCount,
      high_risk_samples: highRiskCount,
      threat_distribution: threatDistribution,
      action_distribution: actionCounts,
      recent_analyses: records.slice(0, 6),
      most_recent_decision: mostRecent,
    };
  }
}
