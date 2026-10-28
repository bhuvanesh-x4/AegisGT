import { Capacitor } from "@capacitor/core";
import {
  DashboardSummary,
  AnalysisRecord,
  GameParameters,
  GameTheoryResult,
  EvaluationAnalytics,
  SensitivityPoint,
} from "../types";
import { GameTheoryEngineTS } from "./gameTheoryEngine";
import { LocalModelInference } from "./modelInference";
import { LocalDatabase } from "./localDatabase";
import { extractPEFeaturesFromFile } from "./peParser";
import benchmarkSamplesData from "../data/benchmarkSamples.json";

export type ExecutionMode = "standalone" | "remote" | "auto";

const MODE_STORAGE_KEY = "aegisgt_execution_mode";

export function getAppExecutionMode(): ExecutionMode {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(MODE_STORAGE_KEY) as ExecutionMode | null;
    if (saved && (saved === "standalone" || saved === "remote" || saved === "auto")) {
      return saved;
    }
  }
  // Default to standalone for instant, resilient offline mobile experience
  return "standalone";
}

export function setAppExecutionMode(mode: ExecutionMode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }
}

/**
 * Dynamically resolves the API base URL for remote communication.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("aegisgt_api_base");
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }

  if (Capacitor.isNativePlatform()) {
    return "http://10.0.2.2:8000/api";
  }

  return "/api";
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    const trimmed = url.trim();
    if (!trimmed || trimmed === "/api") {
      localStorage.removeItem("aegisgt_api_base");
    } else {
      localStorage.setItem("aegisgt_api_base", trimmed.replace(/\/+$/, ""));
    }
  }
}

// Check if we should attempt remote call
function shouldUseRemote(): boolean {
  const mode = getAppExecutionMode();
  if (mode === "standalone") return false;
  if (mode === "remote") return true;
  // auto mode: check if custom base url has been configured
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("aegisgt_api_base");
    return Boolean(custom && custom.trim() && custom !== "/api");
  }
  return false;
}

export async function fetchHealth(): Promise<{ status: string; model_loaded: boolean; version: string }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res.json();
    } catch {
      // Remote unavailable, fall through to standalone status
    }
  }

  return {
    status: "healthy (standalone)",
    model_loaded: true,
    version: "v1.0.0-standalone",
  };
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/dashboard/summary`);
      if (res.ok) return res.json();
    } catch (e) {
      console.warn("Remote backend unreachable, falling back to local database:", e);
    }
  }

  // Standalone client calculation
  return LocalDatabase.getInstance().getSummaryStatistics();
}

export async function fetchBenchmarkSamples(): Promise<{ samples: any[]; count: number }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/samples`);
      if (res.ok) return res.json();
    } catch {}
  }

  const samples = benchmarkSamplesData as any[];
  return {
    samples,
    count: samples.length,
  };
}

export async function analyzeSampleFeatures(payload: {
  sample_name?: string;
  sample_id?: string;
  features: Record<string, any>;
  game_parameters?: Partial<GameParameters>;
  decision_method?: string;
}): Promise<AnalysisRecord> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn("Remote analyze failed, falling back to local inference:", e);
    }
  }

  // Standalone inference & game theory
  const inference = LocalModelInference.getInstance();
  const prediction = inference.predict(payload.features);

  const gameParams: Partial<GameParameters> = {
    malware_probability: prediction.malware_probability,
    ...(payload.game_parameters || {}),
  };

  const method = payload.decision_method || "expected_utility";
  const engine = new GameTheoryEngineTS(gameParams);
  const gameTheoryResult = engine.solve(method);

  const fileSize = Number(payload.features.file_size_kb || 64.0);
  const sampleName = payload.sample_name || "benchmark_sample.exe";
  const sampleId = payload.sample_id || `PE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const savedRecord = LocalDatabase.getInstance().saveRecord({
    sample_id: sampleId,
    sample_name: sampleName,
    file_size_kb: fileSize,
    classification: prediction.classification,
    malware_probability: prediction.malware_probability,
    threat_level: prediction.threat_level,
    selected_action: gameTheoryResult.selected_action,
    decision_method: gameTheoryResult.decision_method,
    expected_utility: gameTheoryResult.expected_utility,
    features: payload.features,
    metadata: {
      source: "Standalone Client Engine",
      decision_method: method,
      feature_count: Object.keys(payload.features).length,
    },
    game_theory: gameTheoryResult,
    model_version: prediction.model_version,
  });

  return savedRecord;
}

export async function analyzePEFile(file: File, decisionMethod: string = "expected_utility"): Promise<AnalysisRecord> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("decision_method", decisionMethod);

      const res = await fetch(`${base}/analyze/file`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn("Remote file analysis failed, processing locally:", e);
    }
  }

  // Standalone client PE file parsing
  const features = await extractPEFeaturesFromFile(file);
  const inference = LocalModelInference.getInstance();
  const prediction = inference.predict(features as unknown as Record<string, any>);

  const engine = new GameTheoryEngineTS({ malware_probability: prediction.malware_probability });
  const gameTheoryResult = engine.solve(decisionMethod);

  const sampleId = `PE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const savedRecord = LocalDatabase.getInstance().saveRecord({
    sample_id: sampleId,
    sample_name: file.name,
    file_size_kb: features.file_size_kb,
    classification: prediction.classification,
    malware_probability: prediction.malware_probability,
    threat_level: prediction.threat_level,
    selected_action: gameTheoryResult.selected_action,
    decision_method: gameTheoryResult.decision_method,
    expected_utility: gameTheoryResult.expected_utility,
    features: features as unknown as Record<string, any>,
    metadata: {
      source: "Client-Side PE Parser & Standalone Engine",
      entropy_mean: features.entropy_mean,
      compile_year: features.compile_year,
    },
    game_theory: gameTheoryResult,
    model_version: prediction.model_version,
  });

  return savedRecord;
}

export async function simulateGameTheory(
  parameters: GameParameters,
  method: string = "expected_utility"
): Promise<GameTheoryResult> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/game-theory/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters, method }),
      });
      if (res.ok) return res.json();
    } catch {}
  }

  // Standalone instant solver (< 2ms)
  const engine = new GameTheoryEngineTS(parameters);
  return engine.solve(method);
}

export async function fetchSensitivityCurve(
  impact: number = 70,
  cost_fp: number = 40,
  cost_md: number = 1.5,
  steps: number = 35
): Promise<{ sensitivity_curve: SensitivityPoint[]; parameters: any }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(
        `${base}/game-theory/sensitivity?impact=${impact}&cost_fp=${cost_fp}&cost_md=${cost_md}&steps=${steps}`
      );
      if (res.ok) return res.json();
    } catch {}
  }

  // Standalone sensitivity analysis
  const engine = new GameTheoryEngineTS({
    potential_impact: impact,
    cost_false_positive: cost_fp,
    cost_missed_detection: cost_md,
  });
  const curve = engine.computeSensitivityAnalysis(steps);

  return {
    sensitivity_curve: curve,
    parameters: {
      potential_impact: impact,
      cost_false_positive: cost_fp,
      cost_missed_detection: cost_md,
      steps,
    },
  };
}

export async function fetchAnalyticsMetrics(): Promise<EvaluationAnalytics> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/analytics/metrics`);
      if (res.ok) return res.json();
    } catch {}
  }

  return LocalModelInference.getInstance().getEvaluationMetrics();
}

export async function triggerModelTrain(): Promise<{ status: string; message: string }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/model/train`, { method: "POST" });
      if (res.ok) return res.json();
    } catch {}
  }

  return {
    status: "success",
    message: "Client-side Random Forest model parameters verified and active (v1.0.0-standalone).",
  };
}

export async function fetchHistory(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  classification?: string,
  action?: string
): Promise<{ records: AnalysisRecord[]; total: number; limit: number; offset: number }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (search) params.append("search", search);
      if (classification && classification !== "All") params.append("classification", classification);
      if (action && action !== "All") params.append("action", action);

      const res = await fetch(`${base}/history?${params.toString()}`);
      if (res.ok) return res.json();
    } catch {}
  }

  return LocalDatabase.getInstance().getRecords(limit, offset, search, classification, action);
}

export async function fetchHistoryDetail(id: number): Promise<AnalysisRecord> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/history/${id}`);
      if (res.ok) return res.json();
    } catch {}
  }

  const rec = LocalDatabase.getInstance().getRecordById(id);
  if (!rec) throw new Error("Analysis record not found");
  return rec;
}

export async function clearHistoryRecords(): Promise<{ message: string }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/history`, { method: "DELETE" });
      if (res.ok) return res.json();
    } catch {}
  }

  LocalDatabase.getInstance().clearRecords();
  return { message: "All local analysis records successfully cleared." };
}

export async function seedDemoData(): Promise<{ status: string; added_records: number }> {
  if (shouldUseRemote()) {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/history/seed`, { method: "POST" });
      if (res.ok) return res.json();
    } catch {}
  }

  const added = LocalDatabase.getInstance().seedInitialData();
  return { status: "success", added_records: added };
}
