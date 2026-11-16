# Autonomous IT Incident Resolution Agent

Enterprise-grade AI system for automated Tier-1 IT incident triage, runbook matching, telemetry diagnostics, human-in-the-loop remediation, and closed-loop verification.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       React 18 + TypeScript UI       |
                      |  (Employee Portal & Admin Dashboard)  |
                      +-------------------+-------------------+
                                          | REST / JSON
                                          v
                      +---------------------------------------+
                      |         FastAPI Python Backend        |
                      |   - Pydantic v2 Schema Validation     |
                      |   - Async SQLAlchemy 2.0 ORM Engine   |
                      |   - Incident Lifecycle State Machine  |
                      |   - Tamper-Evident Audit Logging      |
                      +-------------------+-------------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
+-----------------------------------+             +-----------------------------------+
|      PostgreSQL / SQLite DB       |             |         Central AI Agent          |
|  - Incidents & Classifications    |             |  - Google Gemini 2.5 Flash        |
|  - SOP Runbooks (Knowledge Base)  |             |  - Strict Function Calling        |
|  - Approvals & Audit Trails       |             |  - Allowlisted Modular Tools      |
+-----------------------------------+             +-----------------------------------+
```

---

## Day 1 Implementation Completed

1. **Full Database Schema (SQLAlchemy 2.0 Async):**
   - `employees`: User identities and role-based permissions (`EMPLOYEE`, `ADMIN`).
   - `incidents`: Core ticket entity tracking status (`SUBMITTED`, `CLASSIFIED`, `INVESTIGATING`, `AWAITING_APPROVAL`, `REMEDIATING`, `VERIFYING`, `RESOLVED`, `ESCALATED`).
   - `incident_classifications`: Output of AI categorization, priority, and symptoms.
   - `knowledge_documents`: Standard Operating Procedures (SOPs) and allowable tools.
   - `diagnostic_results`: Pre- and post-remediation system telemetry.
   - `remediation_actions`: Log of executed configuration and service actions.
   - `approval_requests`: Human-in-the-loop authorization gates for privileged operations.
   - `escalation_records`: Formal handoff packages for Tier-2 engineering.
   - `notifications`: Real-time user status notifications.
   - `audit_logs`: Append-only, tamper-evident audit history.

2. **Backend API Endpoints (FastAPI):**
   - `POST /api/v1/incidents/`: Ingests natural-language complaints, assigns ticket numbers (e.g. `INC-10042`), records audit trail, and stores in database.
   - `GET /api/v1/incidents/`: Lists incidents with status filtering for Employee and Admin views.
   - `GET /api/v1/incidents/{ticket_number}`: Retrieves complete ticket dossier with diagnostics and approval state.
   - `GET /api/v1/health`: Health status probe.

3. **Enterprise UI Dual-Portal (React + TypeScript + Tailwind CSS):**
   - **Navbar:** Mode switcher between Employee Portal and IT Admin Dashboard, real-time agent engine indicator, and authenticated user identity.
   - **Smart Incident Intake Form:** Problem description with character counter, pre-filled device context (`CORP-LAPTOP-042`, `Windows 11`), and 4 quick-fill synthetic test templates (VPN Golden Path, Adapter Error 502, Internal DNS, SSO Lockout).
   - **Live Incident Tracker:** 5-step visual progress stepper (`Submitted` -> `AI Classification` -> `Diagnostic Probes` -> `Controlled Fix` -> `Verified Resolution`), live state polling, and complaint narrative.
   - **IT Admin Dashboard:** KPI metrics cards, status filters (`SUBMITTED`, `INVESTIGATING`, `RESOLVED`, `ESCALATED`), paginated incident queue table with direct links to tickets.

4. **15 Synthetic Incident Scenarios & Foundation Runbooks:**
   - Pre-seeded in `backend/app/fixtures/sample_incidents.json` and `backend/app/fixtures/runbooks.json` (including `SOP-NET-001: AnyConnect VPN Troubleshooting Runbook`).

---

## How to Run

### 1. Backend Server
```powershell
.\run_backend.ps1
# Server runs at http://localhost:8000
# OpenAPI Interactive Docs: http://localhost:8000/docs
```

### 2. Frontend Development Server
```powershell
.\run_frontend.ps1
# UI opens at http://localhost:5173
```

### 3. Run Backend Test Suite
```powershell
$env:PYTHONPATH = "$PWD\backend"
python -m pytest backend/tests -v
```

