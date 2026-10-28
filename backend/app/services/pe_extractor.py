"""
Safe Static Feature Extractor for Windows PE Executables.

Inspects Windows Portable Executable (PE) headers, sections, imports, and metadata
without executing or running the binary. Calculates Shannon entropy, extracts key
architectural attributes, and formats into a model-compatible static feature vector.
"""

import math
import io
from typing import Dict, Any, List
import pefile


# Critical API calls frequently utilized in malware injection, evasion, or persistence
SUSPICIOUS_APIS = {
    "virtualallocex", "createremotethread", "writeprocessmemory", "readprocessmemory",
    "openprocess", "setwindowshookex", "ptrace", "isdebuggerpresent", "checkremotedebuggerpresent",
    "ntqueryinformationprocess", "outputdebugstring", "urlcache", "urldownloadtofile",
    "httpsendrequest", "internetconnect", "winhttprequest", "regsetvalueex", "cryptencrypt",
    "adjusttokenprivileges", "createprocesswithtokenw", "lookupprivilegevaluew"
}

FEATURE_COLUMNS = [
    "file_size_kb",
    "section_count",
    "entropy_mean",
    "entropy_max",
    "has_debug",
    "has_tls",
    "num_imports",
    "num_exports",
    "virtual_size_kb",
    "suspicious_imports_count",
    "has_signature",
    "pe_characteristics",
    "subsystem",
    "compile_year",
]


def calculate_shannon_entropy(data: bytes) -> float:
    """Calculates Shannon entropy in bits (0.0 to 8.0). High values (>7.0) indicate compression/encryption."""
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    occurrences = [0] * 256
    for byte in data:
        occurrences[byte] += 1
    for count in occurrences:
        if count == 0:
            continue
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def extract_pe_features_from_bytes(file_bytes: bytes, filename: str = "sample.exe") -> Dict[str, Any]:
    """
    Safely parses PE binary bytes into structured metadata and static feature vector.
    Raises ValueError if binary is not a valid Windows PE format.
    """
    file_size_kb = len(file_bytes) / 1024.0

    try:
        pe = pefile.PE(data=file_bytes, fast_load=False)
    except Exception as e:
        raise ValueError(f"Failed to parse PE file '{filename}': {str(e)}")

    try:
        # Sections analysis
        section_count = len(pe.sections)
        section_entropies = []
        section_details = []

        for s in pe.sections:
            try:
                name = s.Name.decode('utf-8', errors='ignore').strip('\x00')
            except Exception:
                name = "unknown"
            s_data = s.get_data()
            ent = calculate_shannon_entropy(s_data)
            section_entropies.append(ent)
            section_details.append({
                "name": name,
                "virtual_size": s.Misc_VirtualSize,
                "raw_size": s.SizeOfRawData,
                "entropy": round(ent, 3),
            })

        entropy_mean = float(sum(section_entropies) / len(section_entropies)) if section_entropies else 0.0
        entropy_max = float(max(section_entropies)) if section_entropies else 0.0

        # Debug directory
        has_debug = 1 if hasattr(pe, 'DIRECTORY_ENTRY_DEBUG') else 0

        # TLS (Thread Local Storage)
        has_tls = 1 if hasattr(pe, 'DIRECTORY_ENTRY_TLS') else 0

        # Digital Signature (Security Directory)
        has_sig = 0
        if hasattr(pe, 'OPTIONAL_HEADER'):
            sec_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_SECURITY']]
            if sec_dir.VirtualAddress != 0 and sec_dir.Size > 0:
                has_sig = 1

        # Imports and Suspicious API detection
        num_imports = 0
        suspicious_apis_found = []
        if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                for imp in entry.imports:
                    num_imports += 1
                    if imp.name:
                        api_name = imp.name.decode('utf-8', errors='ignore').lower()
                        if api_name in SUSPICIOUS_APIS:
                            suspicious_apis_found.append(api_name)

        suspicious_imports_count = len(suspicious_apis_found)

        # Exports
        num_exports = 0
        if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
            num_exports = len(pe.DIRECTORY_ENTRY_EXPORT.symbols)

        # Virtual Size
        virtual_size_kb = 0.0
        if hasattr(pe, 'OPTIONAL_HEADER'):
            virtual_size_kb = pe.OPTIONAL_HEADER.SizeOfImage / 1024.0

        # Characteristics & Subsystem
        pe_characteristics = int(pe.FILE_HEADER.Characteristics) if hasattr(pe, 'FILE_HEADER') else 0
        subsystem = int(pe.OPTIONAL_HEADER.Subsystem) if hasattr(pe, 'OPTIONAL_HEADER') else 0

        # Compile Timestamp
        compile_timestamp = int(pe.FILE_HEADER.TimeDateStamp) if hasattr(pe, 'FILE_HEADER') else 0
        # Convert timestamp to year (bounded between 1995 and 2026)
        try:
            import datetime
            compile_year = datetime.datetime.fromtimestamp(compile_timestamp, tz=datetime.timezone.utc).year
            if compile_year < 1995 or compile_year > 2030:
                compile_year = 2022
        except Exception:
            compile_year = 2022

        feature_vector = {
            "file_size_kb": round(file_size_kb, 2),
            "section_count": section_count,
            "entropy_mean": round(entropy_mean, 3),
            "entropy_max": round(entropy_max, 3),
            "has_debug": has_debug,
            "has_tls": has_tls,
            "num_imports": num_imports,
            "num_exports": num_exports,
            "virtual_size_kb": round(virtual_size_kb, 2),
            "suspicious_imports_count": suspicious_imports_count,
            "has_signature": has_sig,
            "pe_characteristics": pe_characteristics,
            "subsystem": subsystem,
            "compile_year": compile_year,
        }

        metadata = {
            "filename": filename,
            "file_size_kb": round(file_size_kb, 2),
            "section_count": section_count,
            "sections": section_details,
            "num_imports": num_imports,
            "num_exports": num_exports,
            "suspicious_apis": list(set(suspicious_apis_found)),
            "has_signature": bool(has_sig),
            "has_debug": bool(has_debug),
            "has_tls": bool(has_tls),
            "compile_timestamp": compile_timestamp,
        }

        return {
            "features": feature_vector,
            "metadata": metadata,
        }

    finally:
        pe.close()
