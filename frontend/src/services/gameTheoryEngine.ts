import { GameParameters, GameTheoryResult, SensitivityPoint, DefenderAction } from "../types";

export const AttackerStrategy = {
  LOW_PROFILE: "Low-profile",
  SUSPICIOUS: "Suspicious",
  EVASIVE: "Evasive",
  ALL: ["Low-profile", "Suspicious", "Evasive"],
} as const;

export const DefenderStrategy = {
  MONITOR: "Monitor" as DefenderAction,
  DEEP_INSPECTION: "Deep Inspection" as DefenderAction,
  CONTAIN: "Contain" as DefenderAction,
  BLOCK: "Block" as DefenderAction,
  ALL: ["Monitor", "Deep Inspection", "Contain", "Block"] as DefenderAction[],
};

// Mitigation effectiveness E(D_i, A_j) in [0, 1]
// Rows: Monitor, Deep Inspection, Contain, Block
// Cols: Low-profile, Suspicious, Evasive
const EFFECTIVENESS_MATRIX: number[][] = [
  [0.05, 0.25, 0.05], // Monitor: passive telemetry misses evasive and stealthy threats
  [0.55, 0.68, 0.72], // Deep Inspection: forensic unpacking identifies threat
  [0.85, 0.92, 0.88], // Contain: sandboxes process, isolates network
  [0.98, 1.00, 0.99], // Block: immediate termination eliminates breach risk completely
];

// Disruption multipliers on benign binaries (False Positive disruption ratio)
const FP_DISRUPTION: number[] = [0.00, 0.15, 0.50, 0.90];

export class GameTheoryEngineTS {
  private params: GameParameters;
  private attackerBeliefs: [number, number, number];

  constructor(params?: Partial<GameParameters>) {
    this.params = {
      malware_probability: 0.5,
      potential_impact: 70.0,
      cost_missed_detection: 1.5,
      cost_false_positive: 40.0,
      cost_monitor: 5.0,
      cost_inspection: 22.0,
      cost_contain: 45.0,
      cost_block: 60.0,
      attacker_prob_low_profile: 0.25,
      attacker_prob_suspicious: 0.45,
      attacker_prob_evasive: 0.30,
      ...params,
    };
    this.attackerBeliefs = this.normalizeAttackerBeliefs();
  }

  private normalizeAttackerBeliefs(): [number, number, number] {
    const p1 = this.params.attacker_prob_low_profile;
    const p2 = this.params.attacker_prob_suspicious;
    const p3 = this.params.attacker_prob_evasive;
    const sum = p1 + p2 + p3;
    if (sum <= 0) {
      return [1 / 3, 1 / 3, 1 / 3];
    }
    return [p1 / sum, p2 / sum, p3 / sum];
  }

  public computePayoffMatrix(): number[][] {
    const p = this.params.malware_probability;
    const impact = this.params.potential_impact;
    const c_md = this.params.cost_missed_detection;
    const c_fp = this.params.cost_false_positive;

    const costs = [
      this.params.cost_monitor,
      this.params.cost_inspection,
      this.params.cost_contain,
      this.params.cost_block,
    ];

    const matrix: number[][] = [];

    for (let i = 0; i < 4; i++) {
      const c_d = costs[i];
      const fp_pen = FP_DISRUPTION[i] * c_fp;
      const u_benign = -(c_d + fp_pen);
      const row: number[] = [];

      for (let j = 0; j < 3; j++) {
        const eff = EFFECTIVENESS_MATRIX[i][j];
        const u_malicious = (2.0 * eff - 1.0) * (impact * c_md) - c_d;
        const cell = p * u_malicious + (1.0 - p) * u_benign;
        row.push(cell);
      }
      matrix.push(row);
    }

    return matrix;
  }

  /**
   * Solves mixed-strategy minimax probabilities using regret matching / fictitious play.
   */
  private solveMixedMinimax(payoffs: number[][]): number[] {
    const numD = 4;
    const numA = 3;
    const iterations = 400;
    const dWeights = [0, 0, 0, 0];
    const aWeights = [0, 0, 0];

    let currentD = 0;
    let currentA = 0;

    for (let t = 0; t < iterations; t++) {
      dWeights[currentD]++;
      aWeights[currentA]++;

      // Best response for Attacker against defender distribution
      let worstPayoffForA = Infinity;
      let nextA = 0;
      for (let j = 0; j < numA; j++) {
        let expectedForDefender = 0;
        for (let i = 0; i < numD; i++) {
          expectedForDefender += (dWeights[i] / (t + 1)) * payoffs[i][j];
        }
        // Attacker minimizes defender's payoff
        if (expectedForDefender < worstPayoffForA) {
          worstPayoffForA = expectedForDefender;
          nextA = j;
        }
      }

      // Best response for Defender against attacker distribution
      let bestPayoffForD = -Infinity;
      let nextD = 0;
      for (let i = 0; i < numD; i++) {
        let expected = 0;
        for (let j = 0; j < numA; j++) {
          expected += (aWeights[j] / (t + 1)) * payoffs[i][j];
        }
        if (expected > bestPayoffForD) {
          bestPayoffForD = expected;
          nextD = i;
        }
      }

      currentD = nextD;
      currentA = nextA;
    }

    const totalD = dWeights.reduce((a, b) => a + b, 0);
    return dWeights.map((w) => (totalD > 0 ? w / totalD : 0.25));
  }

  public solve(method: string = "expected_utility"): GameTheoryResult {
    const payoffs = this.computePayoffMatrix();
    const q = this.attackerBeliefs;

    // Expected utility for each action: dot product of row with q
    const expectedUtilities = payoffs.map((row) =>
      row[0] * q[0] + row[1] * q[1] + row[2] * q[2]
    );

    // Worst case utility for each action: min of row
    const worstCasePerAction = payoffs.map((row) => Math.min(...row));

    // Mixed strategy Nash/Minimax
    const mixedStrategy = this.solveMixedMinimax(payoffs);

    // 1. Expected Utility Decision
    let bestEuIdx = 0;
    for (let i = 1; i < expectedUtilities.length; i++) {
      if (expectedUtilities[i] > expectedUtilities[bestEuIdx]) {
        bestEuIdx = i;
      }
    }
    const bestEuAction = DefenderStrategy.ALL[bestEuIdx];

    // 2. Minimax Decision
    let bestMmIdx = 0;
    for (let i = 1; i < worstCasePerAction.length; i++) {
      if (worstCasePerAction[i] > worstCasePerAction[bestMmIdx]) {
        bestMmIdx = i;
      }
    }
    const bestMinimaxAction = DefenderStrategy.ALL[bestMmIdx];

    let selectedAction: DefenderAction;
    let expectedUtilityVal: number;
    let methodDesc: string;
    let explanation: string;

    if (method === "minimax") {
      selectedAction = bestMinimaxAction;
      expectedUtilityVal = worstCasePerAction[bestMmIdx];
      methodDesc = "Minimax (Worst-Case Robust Defense)";
      explanation = `Selected '${selectedAction}' to guarantee a minimum security payoff of ${expectedUtilityVal.toFixed(
        2
      )} under worst-case attacker behavior, hedging against adversarial evasion.`;
    } else if (method === "nash_equilibrium") {
      let topActionIdx = 0;
      for (let i = 1; i < mixedStrategy.length; i++) {
        if (mixedStrategy[i] > mixedStrategy[topActionIdx]) {
          topActionIdx = i;
        }
      }
      selectedAction = DefenderStrategy.ALL[topActionIdx];
      expectedUtilityVal = expectedUtilities[topActionIdx];
      methodDesc = "Mixed-Strategy Nash Equilibrium";
      explanation = `Selected '${selectedAction}' based on the dominant mixed-strategy Nash equilibrium profile (allocation weight: ${(
        mixedStrategy[topActionIdx] * 100
      ).toFixed(1)}%), balancing unpredictability and deterrence.`;
    } else {
      selectedAction = bestEuAction;
      expectedUtilityVal = expectedUtilities[bestEuIdx];
      methodDesc = "Expected Utility Maximization";
      explanation = `Selected '${selectedAction}' as it yields the highest expected security utility (${expectedUtilityVal.toFixed(
        2
      )}) given estimated malware probability P(M)=${this.params.malware_probability.toFixed(
        2
      )} and strategic belief weights [Low-profile: ${q[0].toFixed(2)}, Suspicious: ${q[1].toFixed(
        2
      )}, Evasive: ${q[2].toFixed(2)}].`;
    }

    const payoffTable = DefenderStrategy.ALL.map((dAction, i) => ({
      defender_strategy: dAction,
      low_profile: Number(payoffs[i][0].toFixed(2)),
      suspicious: Number(payoffs[i][1].toFixed(2)),
      evasive: Number(payoffs[i][2].toFixed(2)),
      expected_utility: Number(expectedUtilities[i].toFixed(2)),
      worst_case_utility: Number(worstCasePerAction[i].toFixed(2)),
      mixed_strategy_prob: Number(mixedStrategy[i].toFixed(3)),
    }));

    return {
      selected_action: selectedAction,
      decision_method: methodDesc,
      method_key: method,
      expected_utility: Number(expectedUtilityVal.toFixed(2)),
      explanation,
      defender_strategies: [...DefenderStrategy.ALL],
      attacker_strategies: [...AttackerStrategy.ALL],
      attacker_beliefs: {
        [AttackerStrategy.LOW_PROFILE]: Number(q[0].toFixed(3)),
        [AttackerStrategy.SUSPICIOUS]: Number(q[1].toFixed(3)),
        [AttackerStrategy.EVASIVE]: Number(q[2].toFixed(3)),
      },
      expected_utilities: {
        [DefenderStrategy.MONITOR]: Number(expectedUtilities[0].toFixed(2)),
        [DefenderStrategy.DEEP_INSPECTION]: Number(expectedUtilities[1].toFixed(2)),
        [DefenderStrategy.CONTAIN]: Number(expectedUtilities[2].toFixed(2)),
        [DefenderStrategy.BLOCK]: Number(expectedUtilities[3].toFixed(2)),
      },
      payoff_matrix: payoffs.map((row) => row.map((v) => Number(v.toFixed(2)))),
      payoff_table: payoffTable,
      parameters: { ...this.params },
    };
  }

  public computeSensitivityAnalysis(steps: number = 35): SensitivityPoint[] {
    const origP = this.params.malware_probability;
    const curveData: SensitivityPoint[] = [];

    for (let s = 0; s < steps; s++) {
      const pVal = s / (steps - 1);
      this.params.malware_probability = pVal;
      const payoffs = this.computePayoffMatrix();
      const q = this.attackerBeliefs;
      const eus = payoffs.map((row) => row[0] * q[0] + row[1] * q[1] + row[2] * q[2]);

      let bestIdx = 0;
      for (let i = 1; i < eus.length; i++) {
        if (eus[i] > eus[bestIdx]) bestIdx = i;
      }

      curveData.push({
        malware_probability: Number(pVal.toFixed(3)),
        Monitor: Number(eus[0].toFixed(2)),
        "Deep Inspection": Number(eus[1].toFixed(2)),
        Contain: Number(eus[2].toFixed(2)),
        Block: Number(eus[3].toFixed(2)),
        optimal_action: DefenderStrategy.ALL[bestIdx],
        optimal_utility: Number(eus[bestIdx].toFixed(2)),
      });
    }

    this.params.malware_probability = origP;
    return curveData;
  }
}
