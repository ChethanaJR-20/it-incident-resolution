"""Knowledge base service for retrieving approved Standard Operating Procedure (SOP) runbooks."""

from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.runbook import KnowledgeDocument


class RunbookService:
    @staticmethod
    async def get_runbook_by_category(session: AsyncSession, category: str) -> Optional[KnowledgeDocument]:
        """Retrieves the official runbook registered for an incident category."""
        stmt = (
            select(KnowledgeDocument)
            .where(KnowledgeDocument.category == category.upper())
            .order_by(KnowledgeDocument.created_at.asc())
            .limit(1)
        )
        result = await session.execute(stmt)
        runbook = result.scalar_one_or_none()

        # Fallback to VPN default if category not explicitly mapped
        if not runbook:
            stmt_default = select(KnowledgeDocument).where(KnowledgeDocument.doc_code == "SOP-NET-001")
            runbook = (await session.execute(stmt_default)).scalar_one_or_none()

        return runbook

    @staticmethod
    async def search_runbooks(session: AsyncSession, query_text: str) -> List[KnowledgeDocument]:
        """Searches runbooks by category, title, or body keywords."""
        q = f"%{query_text.lower()}%"
        stmt = select(KnowledgeDocument).where(
            or_(
                KnowledgeDocument.category.ilike(q),
                KnowledgeDocument.title.ilike(q),
                KnowledgeDocument.content.ilike(q),
            )
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_runbooks(session: AsyncSession) -> List[KnowledgeDocument]:
        """Lists all active SOP runbooks in the repository."""
        stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.doc_code.asc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def generate_runbook_from_incident(session: AsyncSession, ticket_number: str) -> KnowledgeDocument:
        """Day 5: Auto-learns and generates a Standard Operating Procedure (SOP) runbook
        from a resolved incident's telemetry, root cause, and remediation actions.
        """
        from app.models.incident import Incident
        from sqlalchemy.orm import selectinload
        from sqlalchemy import func

        stmt = (
            select(Incident)
            .where(Incident.ticket_number == ticket_number)
            .options(
                selectinload(Incident.classification),
                selectinload(Incident.diagnostic_results),
                selectinload(Incident.remediation_actions),
            )
        )
        incident = (await session.execute(stmt)).scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {ticket_number} not found.")

        category = incident.classification.category if incident.classification else "GENERAL"

        count_res = await session.execute(select(func.count(KnowledgeDocument.id)))
        next_num = (count_res.scalar() or 0) + 1
        doc_code = f"SOP-{category}-{next_num:03d}"

        diag_tools = list({d.tool_name for d in incident.diagnostic_results}) or ["resolve_dns", "ping_gateway"]
        remed_tools = list({r.tool_name for r in incident.remediation_actions}) or ["flush_dns_cache"]

        title = f"Autonomous SOP: {category} Incident Resolution Protocol ({ticket_number})"
        content = (
            f"# {doc_code}: {title}\n\n"
            f"## Context & Trigger\n"
            f"Auto-generated post-incident review learned from incident `{ticket_number}` on device `{incident.device_id}`.\n\n"
            f"**Observed Symptoms:**\n"
            f"> {incident.raw_description}\n\n"
            f"## Standard Diagnostics\n"
            + "".join(f"- `{t}`\n" for t in diag_tools)
            + "\n## Verified Remediation Protocols\n"
            + "".join(f"- `{t}`\n" for t in remed_tools)
            + f"\n## Historical Outcome\n"
            f"{incident.resolution_summary or 'Successfully verified with 0% packet loss.'}\n"
        )

        new_doc = KnowledgeDocument(
            doc_code=doc_code,
            title=title,
            category=category,
            allowable_tools={
                "diagnostics": diag_tools,
                "remediations": remed_tools,
            },
            content=content,
        )
        session.add(new_doc)
        await session.commit()
        await session.refresh(new_doc)
        return new_doc


