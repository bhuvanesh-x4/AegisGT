import modelData from "../data/modelArtifact.json";
import { ModelPrediction, FeatureContribution, EvaluationAnalytics } from "../types";

export interface ModelArtifact {
  version: string;
  feature_columns: string[];
  feature_importances: number[];
  scaler: {
    mean: number[];
    scale: number[];
  };
  trees: Array<{
    children_left: number[];
    children_right: number[];
    feature: number[];
    threshold: number[];
    values: number[][];
  }>;
  evaluation_metrics: EvaluationAnalytics;
}

const artifact = modelData as unknown as ModelArtifact;

export class LocalModelInference {
  private static instance: LocalModelInference | null = null;

  public static getInstance(): LocalModelInference {
    if (!this.instance) {
      this.instance = new LocalModelInference();
    }
    return this.instance;
  }

  public getFeatureColumns(): string[] {
    return artifact.feature_columns;
  }

  public getEvaluationMetrics(): EvaluationAnalytics {
    return artifact.evaluation_metrics;
  }

  /**
   * Evaluates a single decision tree on the normalized feature vector.
   * Returns [prob_benign, prob_malicious].
   */
  private predictTree(tree: ModelArtifact["trees"][0], scaledFeatures: number[]): [number, number] {
    let node = 0;
    while (tree.children_left[node] !== -1 && tree.children_right[node] !== -1) {
      const featureIdx = tree.feature[node];
      const threshold = tree.threshold[node];
      const val = scaledFeatures[featureIdx];

      if (val <= threshold) {
        node = tree.children_left[node];
      } else {
        node = tree.children_right[node];
      }
    }
    const val = tree.values[node];
    return [val[0], val[1]];
  }

  public predict(featureDict: Record<string, any>): ModelPrediction {
    const rawVector: number[] = [];
    const scaledVector: number[] = [];

    // Scale features using StandardScaler parameters: (x - mean) / scale
    for (let i = 0; i < artifact.feature_columns.length; i++) {
      const col = artifact.feature_columns[i];
      const raw = Number(featureDict[col] ?? 0);
      rawVector.push(raw);

      const mean = artifact.scaler.mean[i];
      const scale = artifact.scaler.scale[i] || 1.0;
      const scaled = (raw - mean) / scale;
      scaledVector.push(scaled);
    }

    // Evaluate each tree and accumulate probabilities
    let sumBenign = 0;
    let sumMalware = 0;
    const numTrees = artifact.trees.length;

    for (let t = 0; t < numTrees; t++) {
      const [pBenign, pMalware] = this.predictTree(artifact.trees[t], scaledVector);
      sumBenign += pBenign;
      sumMalware += pMalware;
    }

    const pMalware = Number((sumMalware / numTrees).toFixed(4));
    const pBenign = Number((sumBenign / numTrees).toFixed(4));
    const isMalicious = pMalware >= 0.5;
    const classification = isMalicious ? "Malicious" : "Benign";

    // Threat level mapping
    let threatLevel: "Low" | "Medium" | "High" | "Critical";
    if (pMalware >= 0.85) {
      threatLevel = "Critical";
    } else if (pMalware >= 0.6) {
      threatLevel = "High";
    } else if (pMalware >= 0.35) {
      threatLevel = "Medium";
    } else {
      threatLevel = "Low";
    }

    // Feature contributions: normalized_val * importance
    const contributions: FeatureContribution[] = [];
    for (let i = 0; i < artifact.feature_columns.length; i++) {
      const col = artifact.feature_columns[i];
      const importance = artifact.feature_importances[i];
      const normVal = Number(scaledVector[i].toFixed(3));
      const contrib = Number((scaledVector[i] * importance).toFixed(4));

      contributions.push({
        feature: col,
        raw_value: rawVector[i],
        normalized_value: normVal,
        importance: Number(importance.toFixed(4)),
        contribution: contrib,
      });
    }

    // Sort by absolute contribution impact descending
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      classification,
      malware_probability: pMalware,
      benign_probability: pBenign,
      threat_level: threatLevel,
      is_malicious: isMalicious,
      model_version: artifact.version,
      feature_contributions: contributions.slice(0, 6),
      analysis_timestamp: new Date().toISOString(),
    };
  }
}
