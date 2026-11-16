import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.models.classification import IncidentClassification
from app.models.incident import Incident
from app.models.audit import AuditLog
from app.agent.gemini_client import GeminiAgentClient
from app.services.runbook_service import RunbookService
from sqlalchemy import select


@pytest.mark.asyncio
async def test_gemini_client_classification_scenarios():
    """Tests the agent classification engine across multiple realistic incident descriptions."""
    client = GeminiAgentClient()

    # Scenario 1: VPN Gateway failure
    res_vpn = await client.classify_incident(
        raw_description="My Cisco AnyConnect VPN client disconnected. It says failed to reach gateway 10.0.4.1.",
        device_id="CORP-LAPTOP-042",
        os_type="Windows 11",
    )
    assert res_vpn.category == "VPN"
    assert res_vpn.priority in ["P1", "P2"]
    assert res_vpn.confidence_score >= 0.90
    assert any("gateway" in s or "vpn" in s for s in res_vpn.extracted_symptoms)

    # Scenario 2: Internal DNS failure
    res_dns = await client.classify_incident(
        raw_description="I can access google.com but cannot resolve domain code.internal for git clone.",
        device_id="CORP-LAPTOP-042",
        os_type="Windows 11",
    )
    assert res_dns.category == "DNS"
    assert res_dns.priority in ["P2", "P3"]

    # Scenario 3: SSO Account lockout
    res_auth = await client.classify_incident(
        raw_description="Locked out of corporate email and Salesforce after password change on phone. SAML expired.",
        device_id="CORP-LAPTOP-042",
        os_type="Windows 11",
    )
    assert res_auth.category == "AUTH"
    assert res_auth.priority in ["P1", "P2"]


@pytest.mark.asyncio
async def test_runbook_retrieval_service():
    """Tests that RunbookService retrieves approved SOP documentation for categories."""
    await init_db()
    async with AsyncSessionLocal() as session:
        # Retrieve VPN SOP
        vpn_sop = await RunbookService.get_runbook_by_category(session, "VPN")
        assert vpn_sop is not None
        assert vpn_sop.doc_code == "SOP-NET-001"
        assert "AnyConnect" in vpn_sop.title
        assert "check_vpn_adapter_status" in vpn_sop.allowable_tools["diagnostics"]
        assert "flush_dns_cache" in vpn_sop.allowable_tools["remediations"]

        # Retrieve DNS SOP
        dns_sop = await RunbookService.get_runbook_by_category(session, "DNS")
        assert dns_sop is not None
        assert dns_sop.doc_code == "SOP-DNS-002"

        # Search runbooks
        matches = await RunbookService.search_runbooks(session, "gateway")
        assert len(matches) >= 1
        assert any(m.doc_code == "SOP-NET-001" for m in matches)


@pytest.mark.asyncio
async def test_end_to_end_ai_triage_flow():
    """Tests the complete Day 2 AI triage pipeline:
    1. Incident submitted.
    2. Agent performs classification & SOP matching.
    3. Status transitions from SUBMITTED to INVESTIGATING.
    4. Database records classification and audit logs.
    """
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Submit incident with auto_triage=True
        payload = {
            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "device_id": "CORP-LAPTOP-042",
            "os_type": "Windows 11",
            "raw_description": "My corporate VPN refuses to connect. Gateway 10.0.4.1 unreachable. Internet browsing works.",
        }
        res = await client.post("/api/v1/incidents/?auto_triage=true", json=payload)
        assert res.status_code == 201
        data = res.json()

        ticket_no = data["ticket_number"]
        assert data["status"] == "INVESTIGATING"
        assert "AI Triage Complete: Category VPN" in data["current_step"]
        assert data["classification"] is not None
        assert data["classification"]["category"] == "VPN"
        assert data["classification"]["priority"] in ["P1", "P2"]

        # Verify database entities
        async with AsyncSessionLocal() as session:
            # Check classification record
            class_record = (
                await session.execute(
                    select(IncidentClassification).join(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalar_one_or_none()

            assert class_record is not None
            assert class_record.category == "VPN"
            assert len(class_record.extracted_symptoms) > 0

            # Check audit trail
            audits = (
                await session.execute(
                    select(AuditLog).join(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalars().all()

            audit_actions = [a.action_performed for a in audits]
            assert "INCIDENT_SUBMITTED" in audit_actions
            assert "AI_TRIAGE_COMPLETED" in audit_actions
