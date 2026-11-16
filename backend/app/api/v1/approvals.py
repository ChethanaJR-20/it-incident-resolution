from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.approval import ApprovalRequest
from app.schemas.approval import ApprovalDecision
from app.agent.orchestrator import orchestrator

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("/pending")
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    """Lists all remediation actions awaiting IT Administrator sign-off."""
    stmt = (
        select(ApprovalRequest)
        .where(ApprovalRequest.status == "PENDING")
        .options(selectinload(ApprovalRequest.incident))
        .order_by(ApprovalRequest.created_at.desc())
    )
    result = await db.execute(stmt)
    approvals = result.scalars().all()

    return [
        {
            "id": a.id,
            "incident_id": a.incident_id,
            "ticket_number": a.incident.ticket_number if a.incident else None,
            "device_id": a.incident.device_id if a.incident else None,
            "action_name": a.action_name,
            "reasoning": a.reasoning,
            "risk_level": a.risk_level,
            "status": a.status,
            "created_at": a.created_at,
        }
        for a in approvals
    ]


@router.post("/{approval_id}/decision")
async def submit_approval_decision(
    approval_id: str,
    payload: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
):
    """IT Administrator authorizes or rejects a proposed privileged remediation action."""
    try:
        result = await orchestrator.handle_approval_decision(
            session=db,
            approval_id=approval_id,
            decision=payload.decision,
            admin_notes=payload.admin_notes,
            reviewed_by=payload.reviewed_by or "e7b1a2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval execution failed: {str(e)}")

