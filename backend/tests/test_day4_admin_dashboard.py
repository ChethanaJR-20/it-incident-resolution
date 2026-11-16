import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.models.incident import Incident
from app.models.audit import AuditLog
from sqlalchemy import select


@pytest.mark.asyncio
async def test_dashboard_metrics_aggregation():
    """Tests the dashboard metrics computation endpoint."""
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Submit a sample ticket
        await client.post(
            "/api/v1/incidents/?auto_triage=true",
            json={
                "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "device_id": "CORP-LAPTOP-042",
                "os_type": "Windows 11",
                "raw_description": "My corporate VPN has stopped functioning.",
            },
        )

        res = await client.get("/api/v1/dashboard/metrics")
        assert res.status_code == 200
        data = res.json()

        assert "total_incidents" in data
        assert data["total_incidents"] >= 1
        assert "resolved_incidents" in data
        assert "pending_approvals" in data
        assert "avg_resolution_time_seconds" in data
        assert len(data["category_distribution"]) >= 1
        assert len(data["priority_distribution"]) >= 1


@pytest.mark.asyncio
async def test_audit_logs_retrieval_and_filtering():
    """Tests fetching chronological immutable audit logs."""
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/dashboard/audit-logs?limit=50")
        assert res.status_code == 200
        logs = res.json()
        assert isinstance(logs, list)
        assert len(logs) >= 1
        first = logs[0]
        assert "actor_type" in first
        assert "action_performed" in first
        assert "timestamp" in first


@pytest.mark.asyncio
async def test_tier2_escalation_dossier_compilation():
    """Tests that unresolvable issues compile a comprehensive Markdown dossier."""
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Submit incident
        sub = await client.post(
            "/api/v1/incidents/?auto_triage=true",
            json={
                "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "device_id": "CORP-LAPTOP-042",
                "os_type": "Windows 11",
                "raw_description": "Cannot connect to VPN. Physical hardware switch error.",
            },
        )
        ticket_no = sub.json()["ticket_number"]

        # Escalate
        esc_res = await client.post(
            f"/api/v1/incidents/{ticket_no}/escalate",
            json={"reason": "Physical interface hardware defect suspected."},
        )
        assert esc_res.status_code == 200
        dossier = esc_res.json()

        assert dossier["ticket_number"] == ticket_no
        assert "Tier-2 Network Engineering" in dossier["assigned_queue"]
        assert "Physical interface hardware defect suspected." in dossier["escalation_reason"]
        assert "# Tier-2 Engineering Incident Escalation Dossier" in dossier["formatted_dossier_markdown"]

        # Check queue
        list_res = await client.get("/api/v1/dashboard/escalations")
        assert list_res.status_code == 200
        esc_list = list_res.json()
        assert any(e["ticket_number"] == ticket_no for e in esc_list)

