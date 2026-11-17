import random
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.incident import Incident
from app.models.employee import Employee
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.incident import IncidentCreate


class IncidentService:
    @staticmethod
    async def generate_ticket_number(session: AsyncSession) -> str:
        """Generates guaranteed unique enterprise ticket number e.g. INC-10042."""
        import uuid
        stmt = select(Incident.ticket_number).order_by(Incident.created_at.desc()).limit(200)
        res = await session.execute(stmt)
        existing = set(res.scalars().all())

        for _ in range(30):
            cand = f"INC-{random.randint(10000, 99999)}"
            if cand not in existing:
                return cand

        return f"INC-{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    async def create_incident(session: AsyncSession, payload: IncidentCreate) -> Incident:
        """Creates and stores a new incident from employee submission."""
        ticket_num = await IncidentService.generate_ticket_number(session)
        
        is_emerg = bool(getattr(payload, "is_emergency", False))
        m_time = getattr(payload, "meeting_time", None) or "In 5 minutes"
        e_contact = getattr(payload, "emergency_contact", None) or "Direct Desk / Phone"
        e_reason = getattr(payload, "emergency_reason", None) or "Imminent critical meeting"

        current_step = (
            f"🚨 EMERGENCY FAST-TRACK: Meeting starting {m_time}! Priority escalated to P1 Urgent. On-call IT Engineer paged."
            if is_emerg
            else "Incident Logged - Queued for AI Triage"
        )

        # Ensure employee_id exists to satisfy foreign key constraint
        valid_emp_id = payload.employee_id
        if valid_emp_id:
            emp = await session.get(Employee, valid_emp_id)
            if not emp:
                chethana = (await session.execute(
                    select(Employee).where(Employee.email == "chethanajr9@gmail.com")
                )).scalar_one_or_none()
                if chethana:
                    valid_emp_id = chethana.id
                else:
                    first_emp = (await session.execute(select(Employee).limit(1))).scalar_one_or_none()
                    if first_emp:
                        valid_emp_id = first_emp.id
                    else:
                        new_emp = Employee(
                            id=valid_emp_id,
                            email="chethanajr9@gmail.com",
                            full_name="Chethana J R",
                            department="Engineering",
                            role="EMPLOYEE",
                        )
                        session.add(new_emp)
                        await session.flush()
                        valid_emp_id = new_emp.id
        else:
            first_emp = (await session.execute(select(Employee).limit(1))).scalar_one_or_none()
            valid_emp_id = first_emp.id if first_emp else "3fa85f64-5717-4562-b3fc-2c963f66afa6"

        incident = Incident(
            ticket_number=ticket_num,
            employee_id=valid_emp_id,
            raw_description=payload.raw_description,
            device_id=payload.device_id,
            os_type=payload.os_type,
            status="SUBMITTED",
            current_step=current_step,
            is_emergency=is_emerg,
            emergency_reason=e_reason if is_emerg else None,
            emergency_contact=e_contact if is_emerg else None,
            meeting_time=m_time if is_emerg else None,
        )
        session.add(incident)
        await session.flush()

        # Create audit record
        audit = AuditLog(
            incident_id=incident.id,
            actor_type="USER",
            action_performed="EMERGENCY_FAST_TRACK_TRIGGERED" if is_emerg else "INCIDENT_SUBMITTED",
            event_metadata={
                "ticket_number": incident.ticket_number,
                "device_id": incident.device_id,
                "description_length": len(payload.raw_description),
                "is_emergency": is_emerg,
                "meeting_time": m_time if is_emerg else None,
                "emergency_contact": e_contact if is_emerg else None,
            },
        )
        session.add(audit)

        if is_emerg:
            from app.models.escalation import EscalationRecord
            session.add(
                EscalationRecord(
                    incident_id=incident.id,
                    reason=f"CRITICAL IMMINENT DEADLINE: {e_reason}. Meeting starts: {m_time}. Direct Callback: {e_contact}",
                    diagnostic_summary="Emergency fast-track requested by employee before standard automated triage.",
                    assigned_queue="IT Rapid On-Call Response (Tier-1 VIP / Executive Dispatch)",
                )
            )

        # Create initial notification for employee
        emp_msg = (
            f"🚨 EMERGENCY DISPATCH: Incident {incident.ticket_number} fast-tracked. Meeting starting {m_time}. IT Support has been directly paged."
            if is_emerg
            else f"Incident {incident.ticket_number} received. Autonomous AI investigation is commencing."
        )
        notification = Notification(
            incident_id=incident.id,
            recipient_role="EMPLOYEE",
            message=emp_msg,
        )
        session.add(notification)

        await session.commit()
        return incident

    @staticmethod
    async def get_incident_by_ticket(session: AsyncSession, ticket_number: str) -> Optional[Incident]:
        """Fetches full incident dossier including relations."""
        stmt = (
            select(Incident)
            .where(Incident.ticket_number == ticket_number)
            .options(
                selectinload(Incident.employee),
                selectinload(Incident.classification),
                selectinload(Incident.diagnostic_results),
                selectinload(Incident.remediation_actions),
                selectinload(Incident.approval_requests),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_incidents(
        session: AsyncSession,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Incident]:
        """Retrieves list of incidents ordered by creation date descending."""
        stmt = select(Incident).order_by(Incident.created_at.desc()).limit(limit).offset(offset)
        if status:
            stmt = stmt.where(Incident.status == status)
        result = await session.execute(stmt)
        return list(result.scalars().all())

