export interface GameParameters {
  malware_probability: number;
  potential_impact: number;
  cost_missed_detection: number;
  cost_false_positive: number;
  cost_monitor: number;
  cost_inspection: number;
  cost_contain: number;
  cost_block: number;
  attacker_prob_low_profile: number;
  attacker_prob_suspicious: number;
  attacker_prob_evasive: number;
}

export interface PayoffTableRow {
  defender_strategy: string;
  low_profile: number;
  suspicious: number;
  evasive: number;
  expected_utility: number;
  worst_case_utility: number;
  mixed_strategy_prob: number;
}

export interface GameTheoryResult {
  selected_action: "Monitor" | "Deep Inspection" | "Contain" | "Block";
  decision_method: string;
  method_key: string;
  expected_utility: number;
  explanation: string;
  defender_strategies: string[];
  attacker_strategies: string[];
  attacker_beliefs: Record<string, number>;
  expected_utilities: Record<string, number>;
  payoff_matrix: number[][];
  payoff_table: PayoffTableRow[];
  parameters: GameParameters;
}

export type DefenderAction = "Monitor" | "Deep Inspection" | "Contain" | "Block";

export interface ModelPrediction {
  classification: "Malicious" | "Benign";
  malware_probability: number;
  benign_probability: number;
  threat_level: "Low" | "Medium" | "High" | "Critical";
  is_malicious: boolean;
  model_version: string;
  feature_contributions: FeatureContribution[];
  analysis_timestamp: string;
}

export interface FeatureContribution {
  feature: string;
  raw_value: number;
  normalized_value: number;
  importance: number;
  contribution: number;
}

export interface AnalysisRecord {
  id?: number;
  sample_id: string;
  sample_name: string;
  file_size_kb: number;
  classification: "Malicious" | "Benign";
  malware_probability: number;
  benign_probability?: number;
  threat_level: "Low" | "Medium" | "High" | "Critical";
  is_malicious?: boolean;
  selected_action: "Monitor" | "Deep Inspection" | "Contain" | "Block";
  decision_method: string;
  expected_utility: number;
  features: Record<string, any>;
  metadata?: Record<string, any>;
  game_theory?: GameTheoryResult;
  feature_contributions?: FeatureContribution[];
  pe_metadata?: Record<string, any>;
  model_version: string;
  created_at?: string;
  analysis_timestamp?: string;
}

export interface DashboardSummary {
  total_samples: number;
  malicious_samples: number;
  benign_samples: number;
  high_risk_samples: number;
  threat_distribution: Array<{ name: string; count: number; color: string }>;
  action_distribution: Record<string, number>;
  recent_analyses: AnalysisRecord[];
  most_recent_decision: {
    sample_id: string;
    sample_name: string;
    selected_action: string;
    decision_method: string;
    expected_utility: number;
    threat_level: string;
    malware_probability: number;
    timestamp: string;
  } | null;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  false_positive_rate: number;
  avg_latency_ms: number;
}

export interface PolicyComparisonItem {
  policy_name: string;
  policy_key: string;
  avg_expected_utility: number;
  false_interruption_rate: number;
  missed_attacks_count: number;
  action_breakdown: Record<string, number>;
  description: string;
}

export interface EvaluationAnalytics {
  model_name: string;
  model_version: string;
  training_samples: number;
  test_samples: number;
  metrics: ModelMetrics;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  feature_importances: Array<{ feature: string; importance: number }>;
  roc_curve: Array<{ fpr: number; tpr: number }>;
  baseline_comparison: {
    model: string;
    accuracy: number;
    f1_score: number;
    roc_auc: number;
  };
  policy_comparison: PolicyComparisonItem[];
  evaluation_timestamp: string;
}

export interface SensitivityPoint {
  malware_probability: number;
  Monitor: number;
  "Deep Inspection": number;
  Contain: number;
  Block: number;
  optimal_action: string;
  optimal_utility: number;
}
