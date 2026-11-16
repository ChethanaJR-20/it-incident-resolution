from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.escalation import EscalationRecord
from app.schemas.dashboard import DashboardMetrics, AuditLogItem
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieves operational KPIs, resolution times, and chart distribution data."""
    return await DashboardService.get_metrics(db)


@router.get("/audit-logs", response_model=List[AuditLogItem])
async def list_audit_logs(
    incident_id: Optional[str] = Query(None, description="Filter by incident UUID"),
    actor_type: Optional[str] = Query(None, description="Filter by actor e.g. USER, AGENT, ADMIN, SYSTEM"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves immutable chronological audit logs."""
    logs = await DashboardService.get_audit_logs(
        db, incident_id=incident_id, actor_type=actor_type, limit=limit, offset=offset
    )
    return logs


@router.get("/escalations")
async def list_escalations(db: AsyncSession = Depends(get_db)):
    """Lists all tickets escalated to human Tier-2 queues."""
    stmt = (
        select(EscalationRecord)
        .options(selectinload(EscalationRecord.incident))
        .order_by(EscalationRecord.escalated_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "id": r.id,
            "incident_id": r.incident_id,
            "ticket_number": r.incident.ticket_number if r.incident else None,
            "device_id": r.incident.device_id if r.incident else None,
            "reason": r.reason,
            "assigned_queue": r.assigned_queue,
            "diagnostic_summary": r.diagnostic_summary,
            "escalated_at": r.escalated_at,
        }
        for r in records
    ]

