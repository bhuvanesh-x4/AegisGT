"""
Main FastAPI Application Entrypoint.

Malware Detection Using Game Theory: An Adaptive Cybersecurity Defense Framework.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import sys
from pathlib import Path

# Ensure project root is on sys.path so 'backend.app...' works from any working directory
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.app.api.endpoints import router as api_router
from backend.app.core.database import init_db, get_summary_statistics, save_analysis_record
from backend.app.models.inference import ModelInferenceService
from backend.app.services.dataset_loader import get_curated_samples
from backend.app.services.pe_extractor import FEATURE_COLUMNS
from backend.app.game_theory.engine import GameTheoryEngine, GameParameters


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and ensure model artifacts exist
    init_db()
    inference_service = ModelInferenceService.get_instance()
    try:
        inference_service.ensure_trained()
    except Exception as e:
        print(f"Warning: Model pre-training deferred: {e}")

    # Seed initial history if empty
    summary = get_summary_statistics()
    if summary["total_samples"] == 0:
        try:
            samples = get_curated_samples()
            for s in samples[:8]:
                features = {col: s[col] for col in FEATURE_COLUMNS if col in s}
                pred = inference_service.predict(features)
                p = pred["malware_probability"]
                engine = GameTheoryEngine(GameParameters(malware_probability=p))
                gres = engine.solve()
                save_analysis_record({
                    "sample_id": s.get("sample_id", "PE-INIT"),
                    "sample_name": s.get("sample_name", "benchmark_sample.exe"),
                    "file_size_kb": features.get("file_size_kb", 64.0),
                    "classification": pred["classification"],
                    "malware_probability": p,
                    "threat_level": pred["threat_level"],
                    "selected_action": gres["selected_action"],
                    "decision_method": gres["decision_method"],
                    "expected_utility": gres["expected_utility"],
                    "features": features,
                    "metadata": {"source": "Initial benchmark initialization"},
                    "game_theory": gres,
                    "model_version": pred["model_version"],
                })
        except Exception as e:
            print(f"Notice: Initial seeding skipped: {e}")

    yield
    # Shutdown logic (if any)


app = FastAPI(
    title="Malware Detection Using Game Theory: An Adaptive Cybersecurity Defense Framework",
    description="Adaptive game-theoretic optimization paired with static PE machine learning classification.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "Malware Detection Using Game Theory API",
        "documentation": "/docs",
        "health": "/api/health",
        "status": "operational"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
