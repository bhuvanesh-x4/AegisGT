"""
Tests for Safe PE Feature Extraction.
"""

import pytest
import io
from backend.app.services.pe_extractor import (
    calculate_shannon_entropy,
    extract_pe_features_from_bytes,
    FEATURE_COLUMNS,
)


def test_shannon_entropy_calculation():
    # Empty bytes
    assert calculate_shannon_entropy(b"") == 0.0
    # Single repeating byte: zero entropy
    assert calculate_shannon_entropy(b"A" * 100) == 0.0
    # Uniform 256 bytes: maximum 8.0 entropy
    uniform_bytes = bytes(range(256))
    ent = calculate_shannon_entropy(uniform_bytes)
    assert pytest.approx(ent, 0.01) == 8.0


def test_invalid_pe_bytes_raises_error():
    fake_bytes = b"NOT_A_PE_FILE_RANDOM_DATA" * 10
    with pytest.raises(ValueError) as exc:
        extract_pe_features_from_bytes(fake_bytes, "dummy.exe")
    assert "Failed to parse PE file" in str(exc.value)


def test_pe_extractor_on_windows_system_binary():
    """Test safe extraction against a real Windows PE executable (sys.executable)."""
    import os
    import sys
    target_exe = sys.executable
    if os.path.exists(target_exe):
        with open(target_exe, "rb") as f:
            content = f.read()
        res = extract_pe_features_from_bytes(content, "python.exe")
        assert "features" in res
        assert "metadata" in res
        features = res["features"]
        for col in FEATURE_COLUMNS:
            assert col in features
        assert features["file_size_kb"] > 0
        assert features["section_count"] >= 1
        assert 0.0 <= features["entropy_mean"] <= 8.0
