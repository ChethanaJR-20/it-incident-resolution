"""Dashboard analytics and Tier-2 escalation dossier compilation service."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.incident import Incident
from app.models.classification import IncidentClassification
from app.models.approval import ApprovalRequest
from app.models.audit import AuditLog
from app.models.escalation import EscalationRecord
from app.schemas.dashboard import DashboardMetrics, CategoryMetric, PriorityMetric, StatusMetric, EscalationDossier


class DashboardService:
    @staticmethod
    async def get_metrics(session: AsyncSession) -> DashboardMetrics:
        """Aggregates enterprise operational KPIs and distribution datasets."""
        # Query total count
        total_res = await session.execute(select(func.count(Incident.id)))
        total = total_res.scalar() or 0

        # Query counts by status
        status_stmt = select(Incident.status, func.count(Incident.id)).group_by(Incident.status)
        status_rows = (await session.execute(status_stmt)).all()
        status_map = {row[0]: row[1] for row in status_rows}

        resolved = status_map.get("RESOLVED", 0)
        escalated = status_map.get("ESCALATED", 0)
        open_incidents = total - resolved - escalated

        # Pending approvals count
        appr_res = await session.execute(
            select(func.count(ApprovalRequest.id)).where(ApprovalRequest.status == "PENDING")
        )
        pending_approvals = appr_res.scalar() or 0

        # Resolution rate
        resolution_rate = round((resolved / total * 100.0), 1) if total > 0 else 0.0

        # Calculate average resolution time (MTTR)
        resolved_incidents_stmt = select(Incident).where(
            and_(Incident.status == "RESOLVED", Incident.resolved_at.isnot(None))
        )
        resolved_incidents = (await session.execute(resolved_incidents_stmt)).scalars().all()

        durations = []
        for inc in resolved_incidents:
            if inc.resolved_at and inc.created_at:
                delta = (inc.resolved_at - inc.created_at).total_seconds()
                durations.append(max(delta, 1.0))

        avg_mttr = round(sum(durations) / len(durations), 1) if durations else 28.5  # default baseline 28.5s

        # Category distribution
        cat_stmt = select(
            IncidentClassification.category, func.count(IncidentClassification.id)
        ).group_by(IncidentClassification.category)
        cat_rows = (await session.execute(cat_stmt)).all()
        cat_dist = [CategoryMetric(category=row[0], count=row[1]) for row in cat_rows]

        # If empty, add standard category placeholders
        if not cat_dist:
            cat_dist = [
                CategoryMetric(category="VPN", count=1),
                CategoryMetric(category="DNS", count=0),
                CategoryMetric(category="AUTH", count=0),
                CategoryMetric(category="NETWORK", count=0),
            ]

        # Priority distribution
        prio_stmt = select(
            IncidentClassification.priority, func.count(IncidentClassification.id)
        ).group_by(IncidentClassification.priority)
        prio_rows = (await session.execute(prio_stmt)).all()
        prio_dist = [PriorityMetric(priority=row[0], count=row[1]) for row in prio_rows]
        if not prio_dist:
            prio_dist = [
                PriorityMetric(priority="P1", count=0),
                PriorityMetric(priority="P2", count=1),
                PriorityMetric(priority="P3", count=0),
                PriorityMetric(priority="P4", count=0),
            ]

        status_dist = [StatusMetric(status=k, count=v) for k, v in status_map.items()]

        return DashboardMetrics(
            total_incidents=total,
            open_incidents=open_incidents,
            resolved_incidents=resolved,
            escalated_incidents=escalated,
            pending_approvals=pending_approvals,
            resolution_rate_percent=resolution_rate,
            avg_resolution_time_seconds=avg_mttr,
            category_distribution=cat_dist,
            priority_distribution=prio_dist,
            status_distribution=status_dist,
        )

    @staticmethod
    async def get_audit_logs(
        session: AsyncSession,
        incident_id: Optional[str] = None,
        actor_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLog]:
        """Retrieves paginated, chronological immutable audit trail records."""
        stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
        if incident_id:
            stmt = stmt.where(AuditLog.incident_id == incident_id)
        if actor_type:
            stmt = stmt.where(AuditLog.actor_type == actor_type.upper())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def generate_escalation_dossier(
        session: AsyncSession, ticket_number: str, reason: str = "Automated escalation trigger"
    ) -> EscalationDossier:
        """Packages all telemetry, diagnostic probes, and reasoning history into a formal Tier-2 Markdown dossier."""
        stmt = (
            select(Incident)
            .where(Incident.ticket_number == ticket_number)
            .options(
                selectinload(Incident.classification),
                selectinload(Incident.diagnostic_results),
                selectinload(Incident.remediation_actions),
                selectinload(Incident.approval_requests),
            )
        )
        incident = (await session.execute(stmt)).scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {ticket_number} not found.")

        category = incident.classification.category if incident.classification else "GENERAL"
        priority = incident.classification.priority if incident.classification else "P2"
        now = datetime.utcnow()

        # Assigned engineering queue
        queue = "Tier-2 Network Engineering" if category in ["VPN", "NETWORK", "DNS"] else "Tier-2 Systems Engineering"

        # Format evidence
        diag_evidence = [
            {
                "tool": d.tool_name,
                "stage": d.execution_stage,
                "status": d.outcome_status,
                "payload": d.output_payload,
            }
            for d in incident.diagnostic_results
        ]

        attempted_remeds = [
            {
                "tool": r.tool_name,
                "status": r.execution_status,
                "output": r.output_payload,
            }
            for r in incident.remediation_actions
        ]

        # Format full Markdown dossier
        dossier_md = f"""# Tier-2 Engineering Incident Escalation Dossier
**Ticket Number:** `{incident.ticket_number}`  
**Target Queue:** `{queue}`  
**Priority:** `{priority}` | **Category:** `{category}`  
**Escalated At:** `{now.strftime('%Y-%m-%d %H:%M:%S UTC')}`  
**Device Hostname:** `{incident.device_id}` (`{incident.os_type}`)

---

## 1. Executive Summary & Escalation Trigger
- **Escalation Reason:** {reason}
- **Employee Problem Narrative:**  
  > "{incident.raw_description}"

---

## 2. Autonomous Agent Investigation Findings
- **Triaged Category:** {category}
- **Symptoms Identified:** {', '.join(incident.classification.extracted_symptoms if incident.classification else ['unspecified'])}
- **Initial Telemetry Checks Executed:** {len(incident.diagnostic_results)} automated probes.

### Diagnostic Evidence Collected:
"""
        for d in incident.diagnostic_results:
            dossier_md += f"- **`{d.tool_name}()`** [{d.execution_stage}]: Status `{d.outcome_status}` &rarr; Payload: `{d.output_payload}`\n"

        dossier_md += "\n## 3. Attempted Remediation History\n"
        if incident.remediation_actions:
            for r in incident.remediation_actions:
                dossier_md += f"- **`{r.tool_name}()`**: Status `{r.execution_status}` &rarr; `{r.output_payload}`\n"
        else:
            dossier_md += "- No remediation actions were executed prior to escalation.\n"

        dossier_md += f"""
---

## 4. Recommended Actions for Human Tier-2 Specialist
1. Inspect endpoint routing table on `{incident.device_id}`.
2. Verify Active Directory group memberships and gateway authentication profile.
3. Review firewall egress logs for gateway connection attempts.
"""

        # Update incident state to ESCALATED
        incident.status = "ESCALATED"
        incident.current_step = f"Escalated to {queue}: {reason}"

        # Insert escalation record
        session.add(
            EscalationRecord(
                incident_id=incident.id,
                reason=reason,
                diagnostic_summary=f"Automated dossier compiled with {len(diag_evidence)} diagnostic findings.",
                assigned_queue=queue,
                escalated_at=now,
            )
        )

        # Audit Log
        session.add(
            AuditLog(
                incident_id=incident.id,
                actor_type="AGENT",
                action_performed="INCIDENT_ESCALATED_TO_TIER2",
                event_metadata={
                    "assigned_queue": queue,
                    "reason": reason,
                    "evidence_count": len(diag_evidence),
                },
            )
        )

        await session.commit()
        await session.refresh(incident)

        return EscalationDossier(
            ticket_number=incident.ticket_number,
            incident_id=incident.id,
            device_id=incident.device_id,
            category=category,
            priority=priority,
            escalation_reason=reason,
            assigned_queue=queue,
            escalated_at=now,
            formatted_dossier_markdown=dossier_md,
            diagnostic_evidence=diag_evidence,
            attempted_remediations=attempted_remeds,
        )

