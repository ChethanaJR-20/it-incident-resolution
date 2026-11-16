from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.incident import IncidentCreate, IncidentSummary, IncidentDetail, EmergencyFastTrackRequest
from app.schemas.dashboard import EscalationDossier
from app.services.incident_service import IncidentService
from app.services.dashboard_service import DashboardService
from app.agent.orchestrator import orchestrator

router = APIRouter(prefix="/incidents", tags=["Incidents"])


class EscalateRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Reason for escalating ticket to human Tier-2 specialist")


@router.post("/", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
async def submit_incident(
    payload: IncidentCreate,
    auto_triage: bool = Query(False, description="Whether to automatically run AI triage upon submission"),
    auto_pilot: bool = Query(False, description="Day 5: Zero-Touch Auto-Pilot execution from ingestion to resolution"),
    db: AsyncSession = Depends(get_db),
):
    """Submits a new IT incident from an employee in natural language."""
    try:
        incident = await IncidentService.create_incident(db, payload)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error creating incident: {str(e)}")

    if auto_pilot:
        try:
            await orchestrator.auto_pilot_resolve(db, incident.ticket_number)
        except Exception:
            await db.rollback()
    elif auto_triage:
        try:
            await orchestrator.triage_and_investigate(db, incident.ticket_number)
        except Exception:
            await db.rollback()

    detailed = await IncidentService.get_incident_by_ticket(db, incident.ticket_number)
    if not detailed:
        raise HTTPException(status_code=404, detail=f"Incident {incident.ticket_number} created but could not be re-queried")
    return detailed


@router.post("/{ticket_number}/auto-resolve")
async def auto_resolve_incident(
    ticket_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Day 5: Triggers full zero-touch autonomous resolution for a specific incident."""
    try:
        result = await orchestrator.auto_pilot_resolve(db, ticket_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-pilot resolution failed: {str(e)}")


@router.post("/batch-auto-resolve")
async def batch_auto_resolve_incidents(
    db: AsyncSession = Depends(get_db),
):
    """Day 5: Auto-resolves all pending, investigating, or submitted incidents in the queue."""
    from sqlalchemy import select
    from app.models.incident import Incident

    stmt = select(Incident).where(
        Incident.status.in_(["SUBMITTED", "INVESTIGATING", "AWAITING_APPROVAL"])
    )
    incidents = (await db.execute(stmt)).scalars().all()
    resolved_tickets = []
    errors = []

    for inc in incidents:
        try:
            res = await orchestrator.auto_pilot_resolve(db, inc.ticket_number)
            resolved_tickets.append(inc.ticket_number)
        except Exception as e:
            errors.append({"ticket_number": inc.ticket_number, "error": str(e)})

    return {
        "status": "BATCH_COMPLETED",
        "total_processed": len(incidents),
        "resolved_tickets": resolved_tickets,
        "errors": errors,
    }


@router.post("/{ticket_number}/emergency-fast-track", response_model=IncidentDetail)
async def emergency_fast_track(
    ticket_number: str,
    payload: EmergencyFastTrackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Escalates an incident to Emergency P1 Fast-Track due to an imminent meeting."""
    from sqlalchemy import select
    from app.models.incident import Incident
    from app.models.escalation import EscalationRecord
    from app.models.notification import Notification
    from app.models.audit import AuditLog

    stmt = select(Incident).where(Incident.ticket_number == ticket_number)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {ticket_number} not found")

    incident.is_emergency = True
    incident.emergency_reason = payload.emergency_reason
    incident.emergency_contact = payload.emergency_contact or "Direct Desk / Extension"
    incident.meeting_time = payload.meeting_time or "In 5 minutes"
    incident.current_step = f"🚨 EMERGENCY FAST-TRACK: Meeting starting {incident.meeting_time}! On-call IT Engineer paged."

    # Add audit log
    db.add(
        AuditLog(
            incident_id=incident.id,
            actor_type="USER",
            action_performed="EMERGENCY_OVERRIDE_ACTIVATED",
            event_metadata={
                "ticket_number": ticket_number,
                "emergency_reason": payload.emergency_reason,
                "meeting_time": payload.meeting_time,
                "emergency_contact": payload.emergency_contact,
            },
        )
    )

    # Add escalation record
    db.add(
        EscalationRecord(
            incident_id=incident.id,
            reason=f"CRITICAL IMMINENT DEADLINE: {payload.emergency_reason}. Meeting at {incident.meeting_time}. Callback: {payload.emergency_contact}",
            diagnostic_summary="Emergency fast-track override activated directly by employee.",
            assigned_queue="IT Rapid On-Call Response (Tier-1 VIP / Executive Dispatch)",
        )
    )

    # Add notification for admin
    db.add(
        Notification(
            incident_id=incident.id,
            recipient_role="ADMIN",
            message=f"🚨 URGENT P1: Incident {ticket_number} flagged EMERGENCY. Meeting in {incident.meeting_time}! Contact: {incident.emergency_contact}",
        )
    )

    await db.commit()
    detailed = await IncidentService.get_incident_by_ticket(db, ticket_number)
    return detailed


@router.post("/{ticket_number}/triage")
async def triage_incident(
    ticket_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Explicitly triggers the Central AI Agent triage and runbook investigation step."""
    try:
        result = await orchestrator.triage_and_investigate(db, ticket_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Triage failed: {str(e)}")


@router.post("/{ticket_number}/diagnose")
async def run_diagnostics(
    ticket_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Executes Day 3 diagnostic tools, applies Tier-1 safe fixes, and pauses for admin approval."""
    try:
        result = await orchestrator.execute_diagnostics_and_propose_remediation(db, ticket_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnostic execution failed: {str(e)}")


@router.post("/{ticket_number}/escalate", response_model=EscalationDossier)
async def escalate_incident(
    ticket_number: str,
    payload: EscalateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Escalates an unresolvable incident to Tier-2 engineering with a complete compiled technical dossier."""
    try:
        dossier = await DashboardService.generate_escalation_dossier(db, ticket_number, reason=payload.reason)
        return dossier
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Escalation failed: {str(e)}")


@router.get("/", response_model=List[IncidentSummary])
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status e.g. SUBMITTED, INVESTIGATING, AWAITING_APPROVAL, RESOLVED, ESCALATED"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Lists incidents with optional filtering for Admin and Employee views."""
    incidents = await IncidentService.list_incidents(db, status=status, limit=limit, offset=offset)
    return incidents


@router.get("/{ticket_number}", response_model=IncidentDetail)
async def get_incident(
    ticket_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full incident dossier including classification, diagnostics, and approvals."""
    incident = await IncidentService.get_incident_by_ticket(db, ticket_number)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {ticket_number} not found")
    return incident
