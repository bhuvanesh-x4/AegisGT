"""
Pydantic API Request and Response Schemas.
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from backend.app.game_theory.engine import GameParameters


class FeatureVectorInput(BaseModel):
    file_size_kb: float = Field(..., ge=0.0)
    section_count: int = Field(..., ge=0)
    entropy_mean: float = Field(..., ge=0.0, le=8.0)
    entropy_max: float = Field(..., ge=0.0, le=8.0)
    has_debug: int = Field(0, ge=0, le=1)
    has_tls: int = Field(0, ge=0, le=1)
    num_imports: int = Field(..., ge=0)
    num_exports: int = Field(0, ge=0)
    virtual_size_kb: float = Field(..., ge=0.0)
    suspicious_imports_count: int = Field(0, ge=0)
    has_signature: int = Field(0, ge=0, le=1)
    pe_characteristics: int = Field(258, ge=0)
    subsystem: int = Field(2, ge=0)
    compile_year: int = Field(2022, ge=1990, le=2035)


class SampleAnalysisRequest(BaseModel):
    sample_id: Optional[str] = None
    sample_name: Optional[str] = "sample.exe"
    features: Dict[str, Any]
    game_parameters: Optional[GameParameters] = None
    decision_method: Optional[str] = "expected_utility"


class GameSimulationRequest(BaseModel):
    parameters: GameParameters
    method: str = Field("expected_utility", description="Decision method: 'expected_utility', 'minimax', 'nash_equilibrium'")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    database_ready: bool
    version: str
    timestamp: str
