"""
Game Theory Engine for Adaptive Cybersecurity Defense.

Models strategic interactions between an Attacker (with strategies: Low-profile, Suspicious, Evasive)
and a Defender (with strategies: Monitor, Deep Inspection, Contain, Block).
Calculates dynamic payoff matrices, expected utilities, minimax strategies, mixed Nash equilibria,
and sensitivity curves over malware probability and risk cost factors.
"""

from typing import Dict, List, Tuple, Any, Optional
import numpy as np
from scipy.optimize import linprog
from pydantic import BaseModel, Field


class AttackerStrategy:
    LOW_PROFILE = "Low-profile"
    SUSPICIOUS = "Suspicious"
    EVASIVE = "Evasive"
    ALL = [LOW_PROFILE, SUSPICIOUS, EVASIVE]


class DefenderStrategy:
    MONITOR = "Monitor"
    DEEP_INSPECTION = "Deep Inspection"
    CONTAIN = "Contain"
    BLOCK = "Block"
    ALL = [MONITOR, DEEP_INSPECTION, CONTAIN, BLOCK]


class GameParameters(BaseModel):
    malware_probability: float = Field(0.5, ge=0.0, le=1.0, description="Estimated probability of maliciousness P(M)")
    potential_impact: float = Field(70.0, ge=1.0, le=100.0, description="Potential incident impact / asset value (0-100)")
    cost_missed_detection: float = Field(1.5, ge=0.1, le=5.0, description="Weight multiplier for missed detection damage")
    cost_false_positive: float = Field(40.0, ge=0.0, le=100.0, description="Cost of false positive interruption (0-100)")
    
    # Defender operational costs
    cost_monitor: float = Field(5.0, ge=0.0, le=50.0, description="Operational cost of passive monitoring")
    cost_inspection: float = Field(22.0, ge=0.0, le=80.0, description="Operational cost of deep forensic inspection")
    cost_contain: float = Field(45.0, ge=0.0, le=100.0, description="Operational cost / disruption of containment")
    cost_block: float = Field(60.0, ge=0.0, le=100.0, description="Operational cost / disruption of blocking")

    # Attacker strategy distribution beliefs: q = [P(low), P(susp), P(evas)]
    attacker_prob_low_profile: float = Field(0.25, ge=0.0, le=1.0)
    attacker_prob_suspicious: float = Field(0.45, ge=0.0, le=1.0)
    attacker_prob_evasive: float = Field(0.30, ge=0.0, le=1.0)


class GameTheoryEngine:
    """
    Evaluates defensive actions under strategic conflict with an intelligent attacker.
    """

    # Baseline mitigation effectiveness E(D_i, A_j) in [0, 1]
    # Rows: Defender (Monitor, Deep Inspection, Contain, Block)
    # Cols: Attacker (Low-profile, Suspicious, Evasive)
    EFFECTIVENESS_MATRIX = np.array([
        [0.05, 0.25, 0.05],  # Monitor: passive telemetry misses evasive and stealthy threats
        [0.55, 0.68, 0.72],  # Deep Inspection: forensic unpacking identifies threat but allows delayed impact
        [0.85, 0.92, 0.88],  # Contain: sandboxes process, isolates network to halt propagation
        [0.98, 1.00, 0.99],  # Block: immediate termination eliminates breach risk completely
    ])

    # Disruption multipliers on benign binaries (False Positive disruption ratio)
    FP_DISRUPTION = np.array([0.00, 0.15, 0.50, 0.90])

    def __init__(self, params: Optional[GameParameters] = None):
        self.params = params or GameParameters()
        self._normalize_attacker_beliefs()

    def _normalize_attacker_beliefs(self) -> np.ndarray:
        q = np.array([
            self.params.attacker_prob_low_profile,
            self.params.attacker_prob_suspicious,
            self.params.attacker_prob_evasive,
        ], dtype=float)
        total = np.sum(q)
        if total <= 0:
            q = np.array([1/3, 1/3, 1/3], dtype=float)
        else:
            q = q / total
        self.attacker_beliefs = q
        return q

    def compute_payoff_matrix(self) -> np.ndarray:
        """
        Builds the 4x3 Defender payoff matrix U_D(D_i, A_j).
        U_D(D_i, A_j) = p * U_malicious(D_i, A_j) + (1-p) * U_benign(D_i)
        """
        p = self.params.malware_probability
        impact = self.params.potential_impact
        c_md = self.params.cost_missed_detection
        c_fp = self.params.cost_false_positive

        costs = np.array([
            self.params.cost_monitor,
            self.params.cost_inspection,
            self.params.cost_contain,
            self.params.cost_block,
        ])

        payoff_matrix = np.zeros((4, 3), dtype=float)

        for i, d_action in enumerate(DefenderStrategy.ALL):
            c_d = costs[i]
            fp_pen = self.FP_DISRUPTION[i] * c_fp
            u_benign = - (c_d + fp_pen)

            for j, a_action in enumerate(AttackerStrategy.ALL):
                eff = self.EFFECTIVENESS_MATRIX[i, j]
                # If malicious: benefit of attack mitigation minus residual breach damage minus operational cost
                # Net impact mitigated = eff * impact * c_md
                # Unmitigated damage = (1 - eff) * impact * c_md
                u_malicious = (2.0 * eff - 1.0) * (impact * c_md) - c_d

                # Expected payoff for this cell:
                payoff_matrix[i, j] = p * u_malicious + (1.0 - p) * u_benign

        return payoff_matrix

    def compute_attacker_payoff_matrix(self) -> np.ndarray:
        """
        Calculates the 4x3 Attacker payoff matrix U_A(D_i, A_j).
        Attacker payoff is positive when attack succeeds (1 - eff) * impact,
        minus attacker operational execution cost.
        """
        impact = self.params.potential_impact
        attacker_costs = np.array([12.0, 8.0, 24.0]) # low-profile, suspicious, evasive craft cost

        payoff_matrix = np.zeros((4, 3), dtype=float)
        for i in range(4):
            for j in range(3):
                eff = self.EFFECTIVENESS_MATRIX[i, j]
                unmitigated_damage = (1.0 - eff) * impact
                reward = 1.2 * unmitigated_damage - attacker_costs[j]
                payoff_matrix[i, j] = reward

        return payoff_matrix

    def solve(self, method: str = "expected_utility") -> Dict[str, Any]:
        """
        Solves the game using the specified method:
        - 'expected_utility': Maximizes expected utility against belief distribution q
        - 'minimax': Chooses the action maximizing worst-case payoff over all attacker strategies
        - 'nash_equilibrium': Calculates zero-sum or bimatrix mixed strategy equilibrium
        """
        payoffs = self.compute_payoff_matrix()
        q = self.attacker_beliefs
        expected_utilities = np.dot(payoffs, q)

        # 1. Expected Utility Decision
        best_eu_idx = int(np.argmax(expected_utilities))
        best_eu_action = DefenderStrategy.ALL[best_eu_idx]

        # 2. Minimax Decision (worst-case attacker action for each defender action)
        worst_case_per_action = np.min(payoffs, axis=1)
        best_minimax_idx = int(np.argmax(worst_case_per_action))
        best_minimax_action = DefenderStrategy.ALL[best_minimax_idx]

        # 3. Mixed Strategy Nash / Minimax via Linear Programming
        # Maximize v subject to sum_i x_i * U_ij >= v for all j, sum x_i = 1, x_i >= 0
        mixed_strategy = self._solve_mixed_minimax(payoffs)

        # Selected decision depending on requested method
        if method == "minimax":
            selected_action = best_minimax_action
            expected_utility_val = float(worst_case_per_action[best_minimax_idx])
            method_desc = "Minimax (Worst-Case Robust Defense)"
            explanation = (
                f"Selected '{selected_action}' to guarantee a minimum security payoff of "
                f"{expected_utility_val:.2f} under worst-case attacker behavior, hedging against adversarial evasion."
            )
        elif method == "nash_equilibrium":
            # Action with highest probability in mixed strategy
            top_action_idx = int(np.argmax(mixed_strategy))
            selected_action = DefenderStrategy.ALL[top_action_idx]
            expected_utility_val = float(expected_utilities[top_action_idx])
            method_desc = "Mixed-Strategy Nash Equilibrium"
            explanation = (
                f"Selected '{selected_action}' based on the dominant mixed-strategy Nash equilibrium profile "
                f"(allocation weight: {mixed_strategy[top_action_idx]*100:.1f}%), balancing unpredictability and deterrence."
            )
        else: # Default: expected_utility
            selected_action = best_eu_action
            expected_utility_val = float(expected_utilities[best_eu_idx])
            method_desc = "Expected Utility Maximization"
            explanation = (
                f"Selected '{selected_action}' as it yields the highest expected security utility "
                f"({expected_utility_val:.2f}) given estimated malware probability P(M)={self.params.malware_probability:.2f} "
                f"and strategic belief weights [Low-profile: {q[0]:.2f}, Suspicious: {q[1]:.2f}, Evasive: {q[2]:.2f}]."
            )

        # Format Payoff Table for frontend visualization
        payoff_table = []
        for i, d_action in enumerate(DefenderStrategy.ALL):
            row = {
                "defender_strategy": d_action,
                "low_profile": round(float(payoffs[i, 0]), 2),
                "suspicious": round(float(payoffs[i, 1]), 2),
                "evasive": round(float(payoffs[i, 2]), 2),
                "expected_utility": round(float(expected_utilities[i]), 2),
                "worst_case_utility": round(float(worst_case_per_action[i]), 2),
                "mixed_strategy_prob": round(float(mixed_strategy[i]), 3),
            }
            payoff_table.append(row)

        return {
            "selected_action": selected_action,
            "decision_method": method_desc,
            "method_key": method,
            "expected_utility": round(expected_utility_val, 2),
            "explanation": explanation,
            "defender_strategies": DefenderStrategy.ALL,
            "attacker_strategies": AttackerStrategy.ALL,
            "attacker_beliefs": {
                AttackerStrategy.LOW_PROFILE: round(float(q[0]), 3),
                AttackerStrategy.SUSPICIOUS: round(float(q[1]), 3),
                AttackerStrategy.EVASIVE: round(float(q[2]), 3),
            },
            "expected_utilities": {
                d: round(float(eu), 2) for d, eu in zip(DefenderStrategy.ALL, expected_utilities)
            },
            "payoff_matrix": [
                [round(float(v), 2) for v in row] for row in payoffs
            ],
            "payoff_table": payoff_table,
            "parameters": self.params.model_dump(),
        }

    def _solve_mixed_minimax(self, payoffs: np.ndarray) -> np.ndarray:
        """
        Solves the defender's optimal mixed strategy over actions using Linear Programming.
        Defender solves: max v s.t. X^T * A >= v * 1^T, sum(X) = 1, X >= 0
        """
        # Shift payoffs to ensure strictly positive values for standard LP solver
        min_val = np.min(payoffs)
        shift = abs(min_val) + 10.0 if min_val <= 0 else 0.0
        M = payoffs + shift # 4 x 3

        # Formulate as min sum(y_i) s.t. M^T * y >= 1, y >= 0 where y_i = x_i / v
        num_defender, num_attacker = M.shape
        c = np.ones(num_defender)
        # -M^T * y <= -1
        A_ub = -M.T
        b_ub = -np.ones(num_attacker)
        bounds = [(0, None) for _ in range(num_defender)]

        res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')
        if res.success and np.sum(res.x) > 0:
            y = res.x
            x = y / np.sum(y)
            return x
        # Fallback to normalized positive expected utilities
        exp_u = np.maximum(payoffs.mean(axis=1), 0.01)
        return exp_u / np.sum(exp_u)

    def compute_sensitivity_analysis(self, steps: int = 40) -> List[Dict[str, Any]]:
        """
        Computes the expected utility of each defender action as malware probability
        varies from 0.0 to 1.0.
        """
        orig_p = self.params.malware_probability
        probabilities = np.linspace(0.0, 1.0, steps)
        curve_data = []

        for p_val in probabilities:
            self.params.malware_probability = float(p_val)
            payoffs = self.compute_payoff_matrix()
            eus = np.dot(payoffs, self.attacker_beliefs)

            best_idx = int(np.argmax(eus))
            curve_data.append({
                "malware_probability": round(float(p_val), 3),
                DefenderStrategy.MONITOR: round(float(eus[0]), 2),
                DefenderStrategy.DEEP_INSPECTION: round(float(eus[1]), 2),
                DefenderStrategy.CONTAIN: round(float(eus[2]), 2),
                DefenderStrategy.BLOCK: round(float(eus[3]), 2),
                "optimal_action": DefenderStrategy.ALL[best_idx],
                "optimal_utility": round(float(eus[best_idx]), 2),
            })

        self.params.malware_probability = orig_p
        return curve_data
