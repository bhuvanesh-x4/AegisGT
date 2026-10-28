"""
Tests for Machine Learning Training and Inference Pipeline.
"""

import pytest
import os
from backend.app.models.trainer import train_and_evaluate_model, MODEL_PATH, METRICS_PATH
from backend.app.models.inference import ModelInferenceService
from backend.app.services.dataset_loader import get_curated_samples
from backend.app.services.pe_extractor import FEATURE_COLUMNS


def test_train_and_evaluate_creates_artifacts():
    results = train_and_evaluate_model()
    assert os.path.exists(MODEL_PATH)
    assert os.path.exists(METRICS_PATH)
    assert "metrics" in results
    assert "accuracy" in results["metrics"]
    assert 0.0 <= results["metrics"]["accuracy"] <= 1.0
    assert "policy_comparison" in results
    assert len(results["policy_comparison"]) == 4


def test_inference_service_predict():
    service = ModelInferenceService.get_instance()
    service.ensure_trained()
    assert service.is_available()

    samples = get_curated_samples()
    assert len(samples) > 0
    sample = samples[0]
    features = {col: sample[col] for col in FEATURE_COLUMNS if col in sample}

    pred = service.predict(features)
    assert "classification" in pred
    assert pred["classification"] in ["Malicious", "Benign"]
    assert 0.0 <= pred["malware_probability"] <= 1.0
    assert pred["threat_level"] in ["Low", "Medium", "High", "Critical"]
    assert len(pred["feature_contributions"]) > 0
