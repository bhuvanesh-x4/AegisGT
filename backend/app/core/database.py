"""
SQLite Database Layer for Analysis History and Persistent Audit Records.

Tracks PE sample static features, ML inferences, game-theoretic defensive selections,
and detailed payoff snapshots.
"""

import os
import sqlite3
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "analysis_history.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id TEXT NOT NULL,
                sample_name TEXT NOT NULL,
                file_size_kb REAL NOT NULL,
                classification TEXT NOT NULL,
                malware_probability REAL NOT NULL,
                threat_level TEXT NOT NULL,
                selected_action TEXT NOT NULL,
                decision_method TEXT NOT NULL,
                expected_utility REAL NOT NULL,
                features_json TEXT NOT NULL,
                metadata_json TEXT,
                game_theory_json TEXT,
                model_version TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sample_id ON analysis_records(sample_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON analysis_records(created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_classification ON analysis_records(classification);")
        conn.commit()


def save_analysis_record(data: Dict[str, Any]) -> int:
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_records (
                sample_id, sample_name, file_size_kb, classification, malware_probability,
                threat_level, selected_action, decision_method, expected_utility,
                features_json, metadata_json, game_theory_json, model_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("sample_id", "UNKNOWN"),
            data.get("sample_name", "unknown.exe"),
            float(data.get("file_size_kb", 0.0)),
            data.get("classification", "Unknown"),
            float(data.get("malware_probability", 0.0)),
            data.get("threat_level", "Low"),
            data.get("selected_action", "Monitor"),
            data.get("decision_method", "Expected Utility Maximization"),
            float(data.get("expected_utility", 0.0)),
            json.dumps(data.get("features", {})),
            json.dumps(data.get("metadata", {})),
            json.dumps(data.get("game_theory", {})),
            data.get("model_version", "v1.0.0"),
            data.get("timestamp", datetime.now(timezone.utc).isoformat()),
        ))
        conn.commit()
        return cursor.lastrowid


def get_analysis_records(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    classification: Optional[str] = None,
    action: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], int]:
    init_db()
    query = "SELECT * FROM analysis_records WHERE 1=1"
    count_query = "SELECT COUNT(*) as count FROM analysis_records WHERE 1=1"
    params = []

    if search:
        query += " AND (sample_id LIKE ? OR sample_name LIKE ?)"
        count_query += " AND (sample_id LIKE ? OR sample_name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if classification and classification.lower() != "all":
        query += " AND classification = ?"
        count_query += " AND classification = ?"
        params.append(classification)

    if action and action.lower() != "all":
        query += " AND selected_action = ?"
        count_query += " AND selected_action = ?"
        params.append(action)

    query += " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    query_params = list(params) + [limit, offset]

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(count_query, params)
        total = cursor.fetchone()["count"]

        cursor.execute(query, query_params)
        rows = cursor.fetchall()

        records = []
        for r in rows:
            rec = dict(r)
            rec["features"] = json.loads(rec["features_json"]) if rec.get("features_json") else {}
            rec["metadata"] = json.loads(rec["metadata_json"]) if rec.get("metadata_json") else {}
            rec["game_theory"] = json.loads(rec["game_theory_json"]) if rec.get("game_theory_json") else {}
            records.append(rec)

        return records, total


def get_analysis_by_id(analysis_id: int) -> Optional[Dict[str, Any]]:
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_records WHERE id = ?", (analysis_id,))
        row = cursor.fetchone()
        if not row:
            return None
        rec = dict(row)
        rec["features"] = json.loads(rec["features_json"]) if rec.get("features_json") else {}
        rec["metadata"] = json.loads(rec["metadata_json"]) if rec.get("metadata_json") else {}
        rec["game_theory"] = json.loads(rec["game_theory_json"]) if rec.get("game_theory_json") else {}
        return rec


def clear_history() -> int:
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM analysis_records")
        deleted = cursor.rowcount
        conn.commit()
        return deleted


def get_summary_statistics() -> Dict[str, Any]:
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM analysis_records")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as count FROM analysis_records WHERE classification = 'Malicious'")
        malicious = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM analysis_records WHERE classification = 'Benign'")
        benign = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM analysis_records WHERE threat_level IN ('High', 'Critical')")
        high_risk = cursor.fetchone()["count"]

        # Action breakdown
        cursor.execute("""
            SELECT selected_action, COUNT(*) as count 
            FROM analysis_records 
            GROUP BY selected_action
        """)
        action_rows = cursor.fetchall()
        actions = {r["selected_action"]: r["count"] for r in action_rows}

        # Recent 5 analyses
        cursor.execute("SELECT * FROM analysis_records ORDER BY created_at DESC, id DESC LIMIT 5")
        recent_rows = cursor.fetchall()
        recent = []
        for r in recent_rows:
            rec = dict(r)
            recent.append(rec)

        # Most recent game theory decision
        most_recent_decision = None
        if recent:
            top = recent[0]
            most_recent_decision = {
                "sample_id": top["sample_id"],
                "sample_name": top["sample_name"],
                "selected_action": top["selected_action"],
                "decision_method": top["decision_method"],
                "expected_utility": top["expected_utility"],
                "threat_level": top["threat_level"],
                "malware_probability": top["malware_probability"],
                "timestamp": top["created_at"],
            }

        return {
            "total_samples": total,
            "malicious_samples": malicious,
            "benign_samples": benign,
            "high_risk_samples": high_risk,
            "threat_distribution": [
                {"name": "Benign", "count": benign, "color": "#10B981"},
                {"name": "Malicious", "count": malicious, "color": "#EF4444"},
                {"name": "Uncertain / Medium", "count": max(0, total - (benign + malicious)), "color": "#F59E0B"},
            ],
            "action_distribution": actions,
            "recent_analyses": recent,
            "most_recent_decision": most_recent_decision,
        }
