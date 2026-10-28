"""
Model Inference Service for Real-Time PE Malware Classification.

Provides safe prediction, calibrated malware probability estimation, threat level mapping,
and feature contribution attribution. Handles model unavailable states gracefully.
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
import joblib

from backend.app.models.trainer import MODEL_PATH, METRICS_PATH, ARTIFACTS_DIR, train_and_evaluate_model
from backend.app.services.pe_extractor import FEATURE_COLUMNS


class ModelUnavailableError(Exception):
    """Raised when classifier model artifacts have not yet been trained or loaded."""
    pass


class ModelInferenceService:
    _instance: Optional["ModelInferenceService"] = None

    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self.version = "v1.0.0"
        self._load_model()

    @classmethod
    def get_instance(cls) -> "ModelInferenceService":
        if cls._instance is None:
            cls._instance = ModelInferenceService()
        return cls._instance

    def _load_model(self) -> bool:
        if os.path.exists(MODEL_PATH):
            try:
                payload = joblib.load(MODEL_PATH)
                self.model = payload["model"]
                self.scaler = payload["scaler"]
                self.feature_columns = payload.get("feature_columns", FEATURE_COLUMNS)
                self.version = payload.get("version", "v1.0.0")
                return True
            except Exception:
                self.model = None
                return False
        return False

    def is_available(self) -> bool:
        return self.model is not None

    def ensure_trained(self) -> Dict[str, Any]:
        """Ensures that model artifacts exist, training the initial baseline if needed."""
        if not self.is_available():
            metrics = train_and_evaluate_model()
            self._load_model()
            return metrics
        return self.get_metrics()

    def get_metrics(self) -> Dict[str, Any]:
        """Returns loaded evaluation metrics from artifacts/evaluation_metrics.json."""
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, "r") as f:
                return json.load(f)
        if not self.is_available():
            raise ModelUnavailableError("No model artifacts found. Please initiate model training.")
        return train_and_evaluate_model()

    def predict(self, feature_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs inference on static PE feature vector.
        """
        if not self.is_available():
            # Auto-load or train if not loaded
            if not self._load_model():
                raise ModelUnavailableError(
                    "Malware classification model is unavailable. Artifacts have not been generated."
                )

        # Validate input features
        row = []
        for col in self.feature_columns:
            val = feature_dict.get(col, 0.0)
            try:
                row.append(float(val))
            except (ValueError, TypeError):
                row.append(0.0)

        X_input = np.array([row])
        X_scaled = self.scaler.transform(X_input)

        pred_class = int(self.model.predict(X_scaled)[0])
        probabilities = self.model.predict_proba(X_scaled)[0]
        p_malware = float(probabilities[1])

        # Threat severity mapping
        if p_malware >= 0.85:
            threat_level = "Critical"
        elif p_malware >= 0.60:
            threat_level = "High"
        elif p_malware >= 0.35:
            threat_level = "Medium"
        else:
            threat_level = "Low"

        classification = "Malicious" if pred_class == 1 else "Benign"

        # Feature contribution computation
        importances = self.model.feature_importances_
        feature_contributions = []
        for i, col in enumerate(self.feature_columns):
            norm_val = X_scaled[0, i]
            # Contribution indicates how strongly this feature pushed towards malicious
            contribution = round(float(norm_val * importances[i]), 4)
            feature_contributions.append({
                "feature": col,
                "raw_value": row[i],
                "normalized_value": round(float(norm_val), 3),
                "importance": round(float(importances[i]), 4),
                "contribution": contribution,
            })

        # Sort by absolute contribution impact
        feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        return {
            "classification": classification,
            "malware_probability": round(p_malware, 4),
            "benign_probability": round(float(probabilities[0]), 4),
            "threat_level": threat_level,
            "is_malicious": bool(pred_class == 1),
            "model_version": self.version,
            "feature_contributions": feature_contributions[:6],
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        }
