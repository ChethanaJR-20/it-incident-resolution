import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import AsyncSessionLocal, init_db
from app.models.incident import Incident
from app.models.audit import AuditLog
from sqlalchemy import select


@pytest.mark.asyncio
async def test_full_day1_incident_intake_workflow():
    """Simulates complete Day 1 end-to-end flow:
    1. System boots and runs init_db (tables + default employee created).
    2. Employee submits a VPN failure complaint.
    3. Ticket is assigned an INC- ticket number and saved in DB.
    4. Audit log entry is automatically created.
    5. Ticket is retrievable via API list and detail endpoints.
    """
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Health probe
        health_res = await client.get("/api/v1/health")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "healthy"

        # Step 2: Employee submits incident
        payload = {
            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "device_id": "CORP-LAPTOP-042",
            "os_type": "Windows 11 Enterprise",
            "raw_description": "My Cisco AnyConnect VPN client refuses to connect. It displays error: 'Connection attempt failed: Gateway 10.0.4.1 not reachable'. Internet browsing works normally.",
        }
        submit_res = await client.post("/api/v1/incidents/", json=payload)
        assert submit_res.status_code == 201
        data = submit_res.json()

        ticket_no = data["ticket_number"]
        assert ticket_no.startswith("INC-")
        assert data["status"] == "SUBMITTED"
        assert data["current_step"] == "Incident Logged - Queued for AI Triage"

        # Step 3: Verify directly in the persistent database
        async with AsyncSessionLocal() as session:
            db_incident = (
                await session.execute(
                    select(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalar_one_or_none()

            assert db_incident is not None
            assert db_incident.device_id == "CORP-LAPTOP-042"
            assert db_incident.status == "SUBMITTED"

            # Verify audit trail record
            audit_entry = (
                await session.execute(
                    select(AuditLog).where(AuditLog.incident_id == db_incident.id)
                )
            ).scalar_one_or_none()

            assert audit_entry is not None
            assert audit_entry.action_performed == "INCIDENT_SUBMITTED"
            assert audit_entry.actor_type == "USER"

        # Step 4: Verify ticket appears in the Admin queue
        queue_res = await client.get("/api/v1/incidents/")
        assert queue_res.status_code == 200
        tickets = queue_res.json()
        matching = [t for t in tickets if t["ticket_number"] == ticket_no]
        assert len(matching) == 1

        # Step 5: Verify detailed dossier
        detail_res = await client.get(f"/api/v1/incidents/{ticket_no}")
        assert detail_res.status_code == 200
        assert detail_res.json()["ticket_number"] == ticket_no

