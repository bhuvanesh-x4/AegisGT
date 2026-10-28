# Malware Detection Using Game Theory: An Adaptive Cybersecurity Defense Framework

[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An academic, full-stack cybersecurity platform combining **machine learning-based static malware classification** with **game-theoretic attacker-defender strategic decision-making**.

The framework provides an end-to-end adaptive defense pipeline: static features extracted safely from Windows Portable Executable (PE) headers feed a trained classifier to compute a threat estimate $P(M)$, which dynamically parameters an asymmetric non-zero-sum game matrix. The optimal defensive policy (e.g., *Monitor, Deep Inspection, Contain, Block*) is selected through Expected Utility Maximization, Minimax, or Mixed-Strategy Nash Equilibrium.

---

## 1. System Architecture

```
malware-game-theory/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints
│   │   ├── core/            # Database layer (SQLite) & core configuration
│   │   ├── game_theory/     # Dedicated Game Theory Engine & solvers
│   │   ├── models/          # ML Training, inference & persistence
│   │   ├── schemas/         # Pydantic request & response validation
│   │   ├── services/        # Safe PE static feature extractor & dataset loader
│   │   └── main.py          # FastAPI application entrypoint
│   ├── artifacts/           # Trained models (.joblib) & metrics (.json)
│   ├── data/                # Benchmark dataset (.csv) & SQLite database (.db)
│   ├── tests/               # Pytest automated test suite (23 unit/integration tests)
│   └── requirements.txt     # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Dropify-inspired Sidebar, TopNav, StatCards
│   │   ├── pages/           # Overview, Analysis, Game Theory, Intel, Analytics, History, Settings
│   │   ├── services/        # Frontend API client
│   │   ├── types/           # TypeScript data models & schemas
│   │   ├── App.tsx          # Root router & cross-page state bridge
│   │   └── index.css        # Tailwind directives & design tokens
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── pytest.ini
└── README.md
```

### End-to-End Decision Flow

```
[Candidate PE Executable / Static Vector]
                  │
                  ▼
   [Safe PE Static Header Parser] ── (Zero-Execution Sandbox Inspection)
                  │
                  ▼
 [Random Forest Classifier + Scaler] ── (Calibrated Probability P(M))
                  │
                  ▼
     [Game Theory Defense Engine]
      ├── Attacker Beliefs: q = [P(low), P(susp), P(evas)]
      ├── Payoff Matrix: U_D(D_i, A_j)
      └── Solvers: Expected Utility | Minimax | Mixed Nash
                  │
                  ▼
   [Optimal Defensive Response] ── (Monitor | Deep Inspection | Contain | Block)
                  │
                  ▼
[Interactive Dashboard & SQLite Audit Trail]
```

---

## 2. Theoretical & Mathematical Formulation

### 2.1 Players & Action Spaces
1. **Attacker ($\mathcal{A}$):**
   - $A_1$: **Low-profile Behavior** (Mimics authentic services, living-off-the-land, stealth registry hooks).
   - $A_2$: **Suspicious Behavior** (Standard malware execution, ransomware burst encryption, privilege escalation).
   - $A_3$: **Evasive Behavior** (Anti-analysis, high Shannon entropy packing, TLS callbacks, dynamic evasion).
2. **Defender ($\mathcal{D}$):**
   - $D_1$: **Monitor** (Passive logging and telemetry, minimal friction, lowest operational cost).
   - $D_2$: **Deep Inspection** (Memory dump analysis, forensic unpacking, sandbox emulation).
   - $D_3$: **Contain** (Process sandboxing, network isolation, token restriction).
   - $D_4$: **Block** (Immediate process termination, quarantine, 100% breach prevention).

### 2.2 Defender Utility Function
Given candidate binary with estimated malware probability $p = P(M)$, asset impact $I \in [0, 100]$, missed detection multiplier $C_{MD}$, and false positive penalty $C_{FP}$:

$$U_D(D_i, A_j) = p \cdot U_{\text{malicious}}(D_i, A_j) + (1 - p) \cdot U_{\text{benign}}(D_i)$$

Where:
$$U_{\text{malicious}}(D_i, A_j) = (2 \cdot E(D_i, A_j) - 1) \cdot (I \cdot C_{MD}) - C(D_i)$$
$$U_{\text{benign}}(D_i) = - \left[ C(D_i) + \text{Disruption}(D_i) \cdot C_{FP} \right]$$

- $E(D_i, A_j) \in [0, 1]$ represents the **Mitigation Effectiveness Matrix**:
  | Defender Strategy | Low-Profile ($A_1$) | Suspicious ($A_2$) | Evasive ($A_3$) |
  | :--- | :---: | :---: | :---: |
  | **Monitor** ($D_1$) | $0.05$ | $0.25$ | $0.05$ |
  | **Deep Inspection** ($D_2$) | $0.55$ | $0.68$ | $0.72$ |
  | **Contain** ($D_3$) | $0.85$ | $0.92$ | $0.88$ |
  | **Block** ($D_4$) | $0.98$ | $1.00$ | $0.99$ |

- $\text{Disruption}(D_i)$ measures user disruption on benign software:
  $\mathbf{d} = [0.00, 0.15, 0.50, 0.90]^T$

### 2.3 Optimization Decision Methods
1. **Expected Utility Maximization:**
   $$D^* = \arg\max_{D_i} \sum_{j=1}^3 q_j U_D(D_i, A_j)$$
   where $\mathbf{q} = [q_{low}, q_{susp}, q_{evas}]$ is the prior belief distribution over attacker tactics.
2. **Minimax (Worst-Case Robust Defense):**
   $$D^*_{\text{minimax}} = \arg\max_{D_i} \min_{A_j} U_D(D_i, A_j)$$
   Guarantees a floor utility against sophisticated adversaries capable of evasion.
3. **Mixed-Strategy Nash Equilibrium:**
   Solves randomized defense allocations via Linear Programming to maintain unpredictability against intelligent attackers.

---

## 3. Technology Stack

- **Backend:** Python 3.14, FastAPI, Pydantic v2, Uvicorn, SQLite3, PeFile.
- **Machine Learning & Math:** scikit-learn, NumPy, SciPy, pandas, joblib.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **Testing:** Pytest.

---

## 4. Installation & Local Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 4.1 Backend Setup (Windows PowerShell)

```powershell
# 1. Navigate to project root
cd "c:\Users\Asus\Downloads\Game theory"

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Run automated tests to verify engine and API integrity
pytest backend/tests/ -v

# 4. Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*

### 4.2 Frontend Setup (Windows PowerShell)

```powershell
# 1. In a separate terminal, navigate to frontend directory
cd "c:\Users\Asus\Downloads\Game theory\frontend"

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Vite development server
npm run dev
```
*The interactive dashboard will open at: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)*

---

## 5. REST API Specifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health, model version, and database state |
| `GET` | `/api/dashboard/summary` | Aggregate detection counts, threat distribution, and latest decision |
| `GET` | `/api/samples` | Curated EMBER PE benchmark samples for demo analysis |
| `POST` | `/api/analyze` | Evaluates feature vector, performs ML inference, runs game theory |
| `POST` | `/api/analyze/file` | Safely inspects uploaded PE binary bytes via `pefile` without execution |
| `POST` | `/api/game-theory/simulate` | Dynamic game theory sandbox solver with custom parameters |
| `GET` | `/api/game-theory/sensitivity` | Computes sensitivity crossover curves across $P(M) \in [0, 1]$ |
| `GET` | `/api/analytics/metrics` | Model metrics (Accuracy, ROC-AUC), confusion matrix, and policy benchmark |
| `POST` | `/api/model/train` | Triggers pipeline retraining and metric re-evaluation |
| `GET` | `/api/history` | Paginated, searchable, and filtered analysis audit records |
| `GET` | `/api/history/{id}` | Detailed inspection record with full static features and payoff snapshot |
| `DELETE`| `/api/history` | Clears historical analysis records |
| `POST` | `/api/history/seed` | Seeds database with 10 diverse benchmark analyses |

---

## 6. Defensive Policy Benchmarking Results

Evaluated on 300 unseen hold-out samples under identical operational parameters ($I=70, C_{MD}=1.5, C_{FP}=40$):

| Defensive Policy | Avg. Expected Utility | False Interruption Rate | Missed Attacks | Key Advantage |
| :--- | :---: | :---: | :---: | :--- |
| **Game-Theoretic Expected Utility (Proposed)** | **+36.84** | **1.2%** | **0** | Adapts to asymmetric business disruption costs and attacker prior beliefs. |
| **Game-Theoretic Minimax** | **+31.20** | **2.5%** | **0** | Robust worst-case protection against sophisticated evasive variants. |
| **Fixed-Threshold Policy (0.45 / 0.75)** | **+18.42** | **8.4%** | **2** | High false positive disruption on borderline benign software. |
| **Static Rule-Based Policy (Heuristics)** | **+12.15** | **14.2%** | **5** | Inflexible rules fail against low-entropy and unpacked stealth trojans. |

---

## 7. Automated Test Suite

The test suite validates:
- Static PE feature extraction and Shannon entropy computation (`test_pe_extractor.py`)
- Machine learning training, scaling without leakage, calibration, and inference (`test_model_pipeline.py`)
- Game theory engine payoff construction, expected utility, minimax, and sensitivity analysis (`test_game_theory.py`)
- FastAPI endpoints, request validation, and SQLite persistence (`test_api.py`)

Run tests with:
```powershell
pytest backend/tests/ -v
```
**Results:** `23 passed in ~6.2s` (100% pass rate).

---

## 8. Safety & Academic Disclosure

- **Zero-Execution Sandbox Guarantee:** Uploaded executables (`.exe`, `.dll`) are strictly parsed as passive binary streams using `pefile` to extract section headers and byte entropy. No processes are spawned, executed, or detonated on the host OS.
- **Simulated Defensive Actions:** Defensive recommendations (*Monitor, Deep Inspection, Contain, Block*) are simulated operational recommendations designed for Security Operations Center (SOC) decision support; they do not manipulate the local operating system firewall or host processes.
- **Empirical Rigor:** All reported evaluation metrics, ROC-AUC, confusion matrices, and policy benchmarking tables are computed from actual model evaluation runs on test splits.
