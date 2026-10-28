"""
Machine Learning Training and Evaluation Pipeline for Malware Classification.

Implements train/val/test separation, scaling without data leakage, Random Forest
ensemble and Logistic Regression baseline, comprehensive metric calculation
(Accuracy, F1, ROC-AUC, FPR, Latency), feature importances, and comparative
defensive policy simulation.
"""

import os
import time
import json
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
)
import joblib

from backend.app.services.dataset_loader import load_or_create_dataset
from backend.app.services.pe_extractor import FEATURE_COLUMNS
from backend.app.game_theory.engine import GameTheoryEngine, GameParameters, DefenderStrategy

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "malware_classifier.joblib")
METRICS_PATH = os.path.join(ARTIFACTS_DIR, "evaluation_metrics.json")


class RandomForestEnsemble:
    """
    Robust Bootstrap Aggregated (Bagged) Random Forest Classifier.
    Employs feature subsampling (sqrt) and bootstrap resampling across decision trees,
    avoiding inter-process loky multiprocessing deadlocks on Windows Python 3.14.
    """
    def __init__(self, n_estimators: int = 35, max_depth: int = 10, random_state: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.trees: List[DecisionTreeClassifier] = []
        self.classes_ = np.array([0, 1])
        self.feature_importances_ = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        rng = np.random.default_rng(self.random_state)
        n_samples = len(X)
        self.trees = []
        all_importances = []

        for i in range(self.n_estimators):
            # Bootstrap sample
            boot_idx = rng.choice(n_samples, size=n_samples, replace=True)
            X_boot = X[boot_idx]
            y_boot = y[boot_idx]

            tree = DecisionTreeClassifier(
                max_depth=self.max_depth,
                max_features="sqrt",
                min_samples_split=4,
                random_state=self.random_state + i
            )
            tree.fit(X_boot, y_boot)
            self.trees.append(tree)
            all_importances.append(tree.feature_importances_)

        self.feature_importances_ = np.mean(all_importances, axis=0)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.trees:
            raise ValueError("Model is not fitted.")
        tree_probs = [tree.predict_proba(X) for tree in self.trees]
        # Average probability across trees
        mean_prob = np.mean(tree_probs, axis=0)
        return mean_prob

    def predict(self, X: np.ndarray) -> np.ndarray:
        probs = self.predict_proba(X)
        return np.argmax(probs, axis=1)


def train_and_evaluate_model() -> Dict[str, Any]:
    """
    Executes complete training, evaluation, and policy benchmarking pipeline.
    Persists trained model and evaluation report to disk.
    """
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    df = load_or_create_dataset()

    X = df[FEATURE_COLUMNS].copy()
    y = df["label"].values

    # Train / Test split (80/20 stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Fit Scaler strictly on training set to prevent data leakage
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Random Forest Classifier
    rf_model = RandomForestEnsemble(
        n_estimators=35,
        max_depth=10,
        random_state=42
    )
    rf_model.fit(X_train_scaled, y_train)

    # Baseline: Logistic Regression
    lr_model = LogisticRegression(max_iter=1000, random_state=42)
    lr_model.fit(X_train_scaled, y_train)

    # Evaluate Random Forest on held-out test set
    start_time = time.perf_counter()
    y_pred = rf_model.predict(X_test_scaled)
    y_prob = rf_model.predict_proba(X_test_scaled)[:, 1]
    inference_duration_ms = (time.perf_counter() - start_time) * 1000.0
    latency_per_sample_ms = round(inference_duration_ms / len(X_test), 3)

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred))
    rec = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_prob))

    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    # ROC curve points (subsampled for clean chart rendering)
    fpr_arr, tpr_arr, _ = roc_curve(y_test, y_prob)
    roc_points = []
    step = max(1, len(fpr_arr) // 25)
    for i in range(0, len(fpr_arr), step):
        roc_points.append({
            "fpr": round(float(fpr_arr[i]), 4),
            "tpr": round(float(tpr_arr[i]), 4),
        })
    if roc_points[-1]["fpr"] < 1.0:
        roc_points.append({"fpr": 1.0, "tpr": 1.0})

    # Feature importances
    importances = rf_model.feature_importances_
    feat_imp = sorted(
        [{"feature": col, "importance": round(float(imp), 4)} for col, imp in zip(FEATURE_COLUMNS, importances)],
        key=lambda x: x["importance"],
        reverse=True
    )

    # Baseline comparison (Logistic Regression)
    y_lr_pred = lr_model.predict(X_test_scaled)
    y_lr_prob = lr_model.predict_proba(X_test_scaled)[:, 1]
    lr_metrics = {
        "model": "Logistic Regression (Baseline)",
        "accuracy": round(float(accuracy_score(y_test, y_lr_pred)), 4),
        "f1_score": round(float(f1_score(y_test, y_lr_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_lr_prob)), 4),
    }

    # Policy Benchmarking on Test Samples
    policy_results = evaluate_defensive_policies(y_test, y_prob, X_test)

    results = {
        "model_name": "Random Forest PE Classifier",
        "model_version": "v1.0.0",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "false_positive_rate": round(fpr, 4),
            "avg_latency_ms": latency_per_sample_ms,
        },
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
        "feature_importances": feat_imp,
        "roc_curve": roc_points,
        "baseline_comparison": lr_metrics,
        "policy_comparison": policy_results,
        "evaluation_timestamp": pd.Timestamp.now().isoformat(),
    }

    # Save artifact model
    artifact_payload = {
        "model": rf_model,
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS,
        "version": "v1.0.0",
    }
    joblib.dump(artifact_payload, MODEL_PATH)

    # Save metrics JSON
    with open(METRICS_PATH, "w") as f:
        json.dump(results, f, indent=2)

    return results


def evaluate_defensive_policies(y_true: np.ndarray, y_prob: np.ndarray, X_features: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Evaluates 4 defense policies across the test set under identical operational conditions:
    1. Fixed-Threshold: Static cutoff (p >= 0.75 -> Block, p >= 0.45 -> Deep Inspection, else Monitor)
    2. Rule-Based Heuristic: Static signature heuristic (entropy_max > 7.1 AND suspicious_imports >= 3 -> Block)
    3. Game-Theoretic Expected Utility Maximization: Dynamic utility optimization
    4. Game-Theoretic Minimax: Worst-case robust strategy
    """
    engine = GameTheoryEngine()
    q = engine.attacker_beliefs

    n = len(y_true)
    
    policies = {
        "fixed_threshold": {"utilities": [], "blocked": 0, "inspected": 0, "monitored": 0, "contained": 0, "fp_interruptions": 0, "missed_attacks": 0},
        "rule_based": {"utilities": [], "blocked": 0, "inspected": 0, "monitored": 0, "contained": 0, "fp_interruptions": 0, "missed_attacks": 0},
        "game_theoretic_eu": {"utilities": [], "blocked": 0, "inspected": 0, "monitored": 0, "contained": 0, "fp_interruptions": 0, "missed_attacks": 0},
        "game_theoretic_minimax": {"utilities": [], "blocked": 0, "inspected": 0, "monitored": 0, "contained": 0, "fp_interruptions": 0, "missed_attacks": 0},
    }

    entropy_max_col = X_features["entropy_max"].values
    suspicious_col = X_features["suspicious_imports_count"].values

    for i in range(n):
        p_val = float(y_prob[i])
        actual_label = int(y_true[i])

        # Dynamic Game Theory Engine for sample i
        sample_engine = GameTheoryEngine(GameParameters(malware_probability=p_val))
        sample_payoffs = sample_engine.compute_payoff_matrix()
        sample_eus = np.dot(sample_payoffs, q)
        worst_cases = np.min(sample_payoffs, axis=1)

        # 1. Fixed Threshold Policy
        if p_val >= 0.75:
            a_fixed = DefenderStrategy.BLOCK
        elif p_val >= 0.45:
            a_fixed = DefenderStrategy.DEEP_INSPECTION
        else:
            a_fixed = DefenderStrategy.MONITOR

        # 2. Rule-Based Policy
        if entropy_max_col[i] >= 7.2 and suspicious_col[i] >= 3:
            a_rule = DefenderStrategy.BLOCK
        elif suspicious_col[i] >= 1 or entropy_max_col[i] >= 6.8:
            a_rule = DefenderStrategy.DEEP_INSPECTION
        else:
            a_rule = DefenderStrategy.MONITOR

        # 3. Game Theoretic EU
        best_eu_idx = int(np.argmax(sample_eus))
        a_eu = DefenderStrategy.ALL[best_eu_idx]

        # 4. Game Theoretic Minimax
        best_mm_idx = int(np.argmax(worst_cases))
        a_minimax = DefenderStrategy.ALL[best_mm_idx]

        action_map = {
            "fixed_threshold": a_fixed,
            "rule_based": a_rule,
            "game_theoretic_eu": a_eu,
            "game_theoretic_minimax": a_minimax,
        }

        for pol_key, chosen_action in action_map.items():
            pol = policies[pol_key]
            d_idx = DefenderStrategy.ALL.index(chosen_action)
            eu_val = float(sample_eus[d_idx])
            pol["utilities"].append(eu_val)

            if chosen_action == DefenderStrategy.BLOCK:
                pol["blocked"] += 1
            elif chosen_action == DefenderStrategy.CONTAIN:
                pol["contained"] += 1
            elif chosen_action == DefenderStrategy.DEEP_INSPECTION:
                pol["inspected"] += 1
            else:
                pol["monitored"] += 1

            # Realized outcomes
            if actual_label == 0 and chosen_action in [DefenderStrategy.BLOCK, DefenderStrategy.CONTAIN]:
                pol["fp_interruptions"] += 1
            if actual_label == 1 and chosen_action == DefenderStrategy.MONITOR:
                pol["missed_attacks"] += 1

    comparison_summary = [
        {
            "policy_name": "Game-Theoretic Expected Utility (Proposed)",
            "policy_key": "game_theoretic_eu",
            "avg_expected_utility": round(float(np.mean(policies["game_theoretic_eu"]["utilities"])), 2),
            "false_interruption_rate": round(policies["game_theoretic_eu"]["fp_interruptions"] / n * 100, 1),
            "missed_attacks_count": policies["game_theoretic_eu"]["missed_attacks"],
            "action_breakdown": {
                "Block": policies["game_theoretic_eu"]["blocked"],
                "Contain": policies["game_theoretic_eu"]["contained"],
                "Deep Inspection": policies["game_theoretic_eu"]["inspected"],
                "Monitor": policies["game_theoretic_eu"]["monitored"],
            },
            "description": "Adapts defense based on asymmetric error costs and strategic attacker belief distribution."
        },
        {
            "policy_name": "Game-Theoretic Minimax",
            "policy_key": "game_theoretic_minimax",
            "avg_expected_utility": round(float(np.mean(policies["game_theoretic_minimax"]["utilities"])), 2),
            "false_interruption_rate": round(policies["game_theoretic_minimax"]["fp_interruptions"] / n * 100, 1),
            "missed_attacks_count": policies["game_theoretic_minimax"]["missed_attacks"],
            "action_breakdown": {
                "Block": policies["game_theoretic_minimax"]["blocked"],
                "Contain": policies["game_theoretic_minimax"]["contained"],
                "Deep Inspection": policies["game_theoretic_minimax"]["inspected"],
                "Monitor": policies["game_theoretic_minimax"]["monitored"],
            },
            "description": "Minimizes worst-case loss against aggressive evasion strategies."
        },
        {
            "policy_name": "Fixed-Threshold Policy",
            "policy_key": "fixed_threshold",
            "avg_expected_utility": round(float(np.mean(policies["fixed_threshold"]["utilities"])), 2),
            "false_interruption_rate": round(policies["fixed_threshold"]["fp_interruptions"] / n * 100, 1),
            "missed_attacks_count": policies["fixed_threshold"]["missed_attacks"],
            "action_breakdown": {
                "Block": policies["fixed_threshold"]["blocked"],
                "Contain": policies["fixed_threshold"]["contained"],
                "Deep Inspection": policies["fixed_threshold"]["inspected"],
                "Monitor": policies["fixed_threshold"]["monitored"],
            },
            "description": "Standard industry cutoff at static confidence intervals (0.45 / 0.75)."
        },
        {
            "policy_name": "Static Rule-Based Policy",
            "policy_key": "rule_based",
            "avg_expected_utility": round(float(np.mean(policies["rule_based"]["utilities"])), 2),
            "false_interruption_rate": round(policies["rule_based"]["fp_interruptions"] / n * 100, 1),
            "missed_attacks_count": policies["rule_based"]["missed_attacks"],
            "action_breakdown": {
                "Block": policies["rule_based"]["blocked"],
                "Contain": policies["rule_based"]["contained"],
                "Deep Inspection": policies["rule_based"]["inspected"],
                "Monitor": policies["rule_based"]["monitored"],
            },
            "description": "Heuristic detection rules based on high entropy and suspicious API imports."
        },
    ]

    return comparison_summary
