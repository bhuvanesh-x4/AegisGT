"""
Unit tests for Game Theory Engine in Adaptive Cybersecurity Defense.
"""

import pytest
import numpy as np
from pydantic import ValidationError
from backend.app.game_theory.engine import (
    GameTheoryEngine,
    GameParameters,
    DefenderStrategy,
    AttackerStrategy,
)


def test_game_theory_initialization():
    params = GameParameters(malware_probability=0.7)
    engine = GameTheoryEngine(params)
    assert engine.params.malware_probability == 0.7
    assert len(engine.attacker_beliefs) == 3
    assert np.isclose(np.sum(engine.attacker_beliefs), 1.0)


def test_payoff_matrix_shape_and_values():
    engine = GameTheoryEngine(GameParameters(malware_probability=0.5))
    payoffs = engine.compute_payoff_matrix()
    assert payoffs.shape == (4, 3)
    assert not np.isnan(payoffs).any()


def test_high_malware_probability_triggers_active_defense():
    """When malware probability is high, the model should prefer Block or Contain."""
    engine = GameTheoryEngine(GameParameters(
        malware_probability=0.95,
        potential_impact=90.0,
        cost_missed_detection=2.0
    ))
    res = engine.solve(method="expected_utility")
    assert res["selected_action"] in [DefenderStrategy.BLOCK, DefenderStrategy.CONTAIN]
    assert res["expected_utility"] > 0


def test_low_malware_probability_triggers_monitor():
    """When sample is almost certainly benign, Monitor should dominate to avoid FP disruption."""
    engine = GameTheoryEngine(GameParameters(
        malware_probability=0.03,
        cost_false_positive=60.0
    ))
    res = engine.solve(method="expected_utility")
    assert res["selected_action"] == DefenderStrategy.MONITOR


def test_moderate_probability_triggers_inspection():
    """When probability is uncertain and false positive cost is high, Deep Inspection provides best tradeoff."""
    engine = GameTheoryEngine(GameParameters(
        malware_probability=0.45,
        cost_false_positive=80.0,
        cost_inspection=15.0
    ))
    res = engine.solve(method="expected_utility")
    assert res["selected_action"] == DefenderStrategy.DEEP_INSPECTION


def test_parameter_change_alters_strategy():
    """Crucial requirement: demonstrating that changing payoff assumptions dynamically alters strategy."""
    benign_engine = GameTheoryEngine(GameParameters(malware_probability=0.05))
    benign_action = benign_engine.solve()["selected_action"]

    malicious_engine = GameTheoryEngine(GameParameters(malware_probability=0.92))
    malicious_action = malicious_engine.solve()["selected_action"]

    assert benign_action != malicious_action
    assert benign_action == DefenderStrategy.MONITOR
    assert malicious_action in [DefenderStrategy.BLOCK, DefenderStrategy.CONTAIN]


def test_minimax_solver():
    engine = GameTheoryEngine(GameParameters(malware_probability=0.6))
    res_minimax = engine.solve(method="minimax")
    assert res_minimax["selected_action"] in DefenderStrategy.ALL
    assert res_minimax["method_key"] == "minimax"


def test_mixed_nash_solver():
    engine = GameTheoryEngine(GameParameters(malware_probability=0.6))
    res_nash = engine.solve(method="nash_equilibrium")
    assert res_nash["selected_action"] in DefenderStrategy.ALL
    assert "mixed_strategy_prob" in res_nash["payoff_table"][0]


def test_sensitivity_analysis():
    engine = GameTheoryEngine()
    curve = engine.compute_sensitivity_analysis(steps=20)
    assert len(curve) == 20
    assert curve[0]["malware_probability"] == 0.0
    assert curve[-1]["malware_probability"] == 1.0
    # At p=0.0, Monitor should have higher utility than Block
    assert curve[0][DefenderStrategy.MONITOR] > curve[0][DefenderStrategy.BLOCK]
    # At p=1.0, Block should have higher utility than Monitor
    assert curve[-1][DefenderStrategy.BLOCK] > curve[-1][DefenderStrategy.MONITOR]


def test_invalid_parameters_raise_validation_error():
    with pytest.raises(ValidationError):
        GameParameters(malware_probability=1.5) # Out of bounds
    with pytest.raises(ValidationError):
        GameParameters(cost_false_positive=-10.0) # Negative
