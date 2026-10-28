"""
FastAPI Route Handlers for Malware Detection and Game Theory Defense.
"""

from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query

from backend.app.schemas.api_schemas import (
    SampleAnalysisRequest,
    GameSimulationRequest,
    HealthResponse,
)
from backend.app.models.inference import ModelInferenceService, ModelUnavailableError
from backend.app.models.trainer import train_and_evaluate_model
from backend.app.game_theory.engine import GameTheoryEngine, GameParameters
from backend.app.services.pe_extractor import extract_pe_features_from_bytes, FEATURE_COLUMNS
from backend.app.services.dataset_loader import get_curated_samples
from backend.app.core.database import (
    save_analysis_record,
    get_analysis_records,
    get_analysis_by_id,
    clear_history,
    get_summary_statistics,
)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    service = ModelInferenceService.get_instance()
    return HealthResponse(
        status="healthy",
        model_loaded=service.is_available(),
        database_ready=True,
        version=service.version,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Returns overview summary counts, threat distribution, recent records, and latest strategic decision."""
    summary = get_summary_statistics()
    return summary


@router.get("/samples")
async def get_benchmark_samples():
    """Returns curated representative PE samples from the benchmark corpus."""
    samples = get_curated_samples()
    return {"samples": samples, "count": len(samples)}


@router.post("/analyze")
async def analyze_sample(request: SampleAnalysisRequest):
    """
    Main integrated pipeline:
    Features -> ML Classification -> Threat Assessment -> Game Theory Optimization -> Persistence
    """
    service = ModelInferenceService.get_instance()
    try:
        service.ensure_trained()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize ML model: {str(e)}")

    # 1. Run Machine Learning Inference
    try:
        prediction = service.predict(request.features)
    except ModelUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

    p_malware = prediction["malware_probability"]

    # 2. Run Game-Theoretic Utility Calculation
    game_params = request.game_parameters or GameParameters()
    # Inject dynamically evaluated malware probability into game parameters
    game_params.malware_probability = p_malware

    engine = GameTheoryEngine(game_params)
    method = request.decision_method or "expected_utility"
    game_result = engine.solve(method=method)

    # 3. Create Sample Identifiers if not provided
    sample_id = request.sample_id
    if not sample_id:
        sh = hashlib.sha256(f"{request.sample_name}_{p_malware}_{datetime.now()}".encode()).hexdigest()[:12]
        sample_id = f"PE-{sh.upper()}"

    # 4. Persist Record to SQLite
    record_payload = {
        "sample_id": sample_id,
        "sample_name": request.sample_name or "sample.exe",
        "file_size_kb": request.features.get("file_size_kb", 0.0),
        "classification": prediction["classification"],
        "malware_probability": p_malware,
        "threat_level": prediction["threat_level"],
        "selected_action": game_result["selected_action"],
        "decision_method": game_result["decision_method"],
        "expected_utility": game_result["expected_utility"],
        "features": request.features,
        "metadata": {"source": "feature_submission"},
        "game_theory": game_result,
        "model_version": prediction["model_version"],
        "timestamp": prediction["analysis_timestamp"],
    }
    record_id = save_analysis_record(record_payload)

    return {
        "id": record_id,
        "sample_id": sample_id,
        "sample_name": request.sample_name,
        "classification": prediction["classification"],
        "malware_probability": p_malware,
        "benign_probability": prediction["benign_probability"],
        "threat_level": prediction["threat_level"],
        "is_malicious": prediction["is_malicious"],
        "feature_contributions": prediction["feature_contributions"],
        "game_theory": game_result,
        "model_version": prediction["model_version"],
        "analysis_timestamp": prediction["analysis_timestamp"],
    }


@router.post("/analyze/file")
async def analyze_uploaded_pe_file(
    file: UploadFile = File(...),
    decision_method: str = Form("expected_utility"),
):
    """
    Safely inspects uploaded PE binary bytes (NO EXECUTION),
    extracts static features via pefile, performs ML inference, and optimizes defense.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Validate PE header magic
    if len(content) < 64 or content[:2] != b"MZ":
        raise HTTPException(
            status_code=400,
            detail="File is not a valid Windows Portable Executable (missing 'MZ' magic bytes)."
        )

    try:
        extracted = extract_pe_features_from_bytes(content, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to safely parse PE structure: {str(e)}")

    features = extracted["features"]
    pe_meta = extracted["metadata"]

    # Run Analysis
    service = ModelInferenceService.get_instance()
    service.ensure_trained()
    prediction = service.predict(features)
    p_malware = prediction["malware_probability"]

    # Game Theory Optimization
    engine = GameTheoryEngine(GameParameters(malware_probability=p_malware))
    game_result = engine.solve(method=decision_method)

    # Compute Sample ID from SHA-256
    file_sha256 = hashlib.sha256(content).hexdigest()
    sample_id = f"PE-{file_sha256[:12].upper()}"

    record_payload = {
        "sample_id": sample_id,
        "sample_name": file.filename,
        "file_size_kb": features.get("file_size_kb", 0.0),
        "classification": prediction["classification"],
        "malware_probability": p_malware,
        "threat_level": prediction["threat_level"],
        "selected_action": game_result["selected_action"],
        "decision_method": game_result["decision_method"],
        "expected_utility": game_result["expected_utility"],
        "features": features,
        "metadata": {**pe_meta, "sha256": file_sha256},
        "game_theory": game_result,
        "model_version": prediction["model_version"],
        "timestamp": prediction["analysis_timestamp"],
    }
    record_id = save_analysis_record(record_payload)

    return {
        "id": record_id,
        "sample_id": sample_id,
        "sample_name": file.filename,
        "classification": prediction["classification"],
        "malware_probability": p_malware,
        "benign_probability": prediction["benign_probability"],
        "threat_level": prediction["threat_level"],
        "is_malicious": prediction["is_malicious"],
        "feature_contributions": prediction["feature_contributions"],
        "pe_metadata": pe_meta,
        "features": features,
        "game_theory": game_result,
        "model_version": prediction["model_version"],
        "analysis_timestamp": prediction["analysis_timestamp"],
    }


@router.post("/game-theory/simulate")
async def simulate_game_theory(request: GameSimulationRequest):
    """
    Dynamic Game Theory Sandbox:
    Calculates payoffs, expected utilities, and optimal strategy for custom parameters.
    """
    engine = GameTheoryEngine(request.parameters)
    result = engine.solve(method=request.method)
    return result


@router.get("/game-theory/sensitivity")
async def get_sensitivity_analysis(
    impact: float = Query(70.0, ge=1.0, le=100.0),
    cost_fp: float = Query(40.0, ge=0.0, le=100.0),
    cost_md: float = Query(1.5, ge=0.1, le=5.0),
    steps: int = Query(35, ge=10, le=100),
):
    """Returns sensitivity curves of expected utilities as malware probability scales from 0 to 1."""
    params = GameParameters(
        potential_impact=impact,
        cost_false_positive=cost_fp,
        cost_missed_detection=cost_md,
    )
    engine = GameTheoryEngine(params)
    curve = engine.compute_sensitivity_analysis(steps=steps)
    return {"sensitivity_curve": curve, "parameters": params.model_dump()}


@router.get("/analytics/metrics")
async def get_evaluation_metrics():
    """Returns actual model evaluation metrics, confusion matrix, ROC points, and policy comparison."""
    service = ModelInferenceService.get_instance()
    try:
        metrics = service.get_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load metrics: {str(e)}")


@router.post("/model/train")
async def trigger_model_training():
    """Triggers dataset generation/loading and fresh model training."""
    try:
        metrics = train_and_evaluate_model()
        ModelInferenceService.get_instance()._load_model()
        return {"status": "success", "message": "Model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    classification: Optional[str] = None,
    action: Optional[str] = None,
):
    """Returns paginated, searchable, and filtered analysis history records."""
    records, total = get_analysis_records(
        limit=limit,
        offset=offset,
        search=search,
        classification=classification,
        action=action,
    )
    return {
        "records": records,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/history/{analysis_id}")
async def get_history_detail(analysis_id: int):
    """Returns single detailed analysis record."""
    record = get_analysis_by_id(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    return record


@router.delete("/history")
async def delete_history():
    """Clears history records."""
    count = clear_history()
    return {"message": f"Successfully deleted {count} records."}


@router.post("/history/seed")
async def seed_demo_history():
    """Populates historical database with representative benchmark sample analyses."""
    samples = get_curated_samples()
    service = ModelInferenceService.get_instance()
    service.ensure_trained()

    added = 0
    for s in samples:
        features = {col: s[col] for col in FEATURE_COLUMNS if col in s}
        prediction = service.predict(features)
        p = prediction["malware_probability"]

        engine = GameTheoryEngine(GameParameters(malware_probability=p))
        game_res = engine.solve()

        save_analysis_record({
            "sample_id": s.get("sample_id", "PE-DEMO"),
            "sample_name": s.get("sample_name", "demo.exe"),
            "file_size_kb": features.get("file_size_kb", 50.0),
            "classification": prediction["classification"],
            "malware_probability": p,
            "threat_level": prediction["threat_level"],
            "selected_action": game_res["selected_action"],
            "decision_method": game_res["decision_method"],
            "expected_utility": game_res["expected_utility"],
            "features": features,
            "metadata": {"sample_origin": "Curated EMBER benchmark sample"},
            "game_theory": game_res,
            "model_version": prediction["model_version"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        added += 1

    return {"status": "success", "added_records": added}
