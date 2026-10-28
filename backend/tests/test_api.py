"""
Integration tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_samples" in data
    assert "threat_distribution" in data


def test_get_benchmark_samples():
    response = client.get("/api/samples")
    assert response.status_code == 200
    data = response.json()
    assert "samples" in data
    assert len(data["samples"]) > 0


def test_analyze_feature_submission():
    payload = {
        "sample_name": "test_trojan.exe",
        "features": {
            "file_size_kb": 240.5,
            "section_count": 5,
            "entropy_mean": 7.2,
            "entropy_max": 7.85,
            "has_debug": 0,
            "has_tls": 1,
            "num_imports": 45,
            "num_exports": 0,
            "virtual_size_kb": 512.0,
            "suspicious_imports_count": 5,
            "has_signature": 0,
            "pe_characteristics": 258,
            "subsystem": 2,
            "compile_year": 2023,
        },
        "decision_method": "expected_utility",
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] in ["Malicious", "Benign"]
    assert "game_theory" in data
    assert "selected_action" in data["game_theory"]
    assert "expected_utility" in data["game_theory"]


def test_game_theory_simulation():
    payload = {
        "parameters": {
            "malware_probability": 0.88,
            "potential_impact": 85.0,
            "cost_missed_detection": 2.0,
            "cost_false_positive": 30.0,
            "cost_monitor": 5.0,
            "cost_inspection": 20.0,
            "cost_contain": 40.0,
            "cost_block": 55.0,
            "attacker_prob_low_profile": 0.2,
            "attacker_prob_suspicious": 0.5,
            "attacker_prob_evasive": 0.3,
        },
        "method": "expected_utility",
    }
    response = client.post("/api/game-theory/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "selected_action" in data
    assert "payoff_matrix" in data
    assert "payoff_table" in data


def test_sensitivity_endpoint():
    response = client.get("/api/game-theory/sensitivity?impact=75&cost_fp=35&steps=15")
    assert response.status_code == 200
    data = response.json()
    assert "sensitivity_curve" in data
    assert len(data["sensitivity_curve"]) == 15


def test_analytics_metrics_endpoint():
    response = client.get("/api/analytics/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "confusion_matrix" in data
    assert "policy_comparison" in data


def test_history_crud():
    # Fetch history
    res = client.get("/api/history?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "records" in data
    assert "total" in data
