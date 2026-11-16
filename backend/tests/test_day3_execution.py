import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.services.simulation_engine import simulation_engine
from app.tools.registry import ToolDispatcher, TIER_1_SAFE, TIER_2_PRIVILEGED
from app.models.incident import Incident
from app.models.approval import ApprovalRequest
from app.models.diagnostic import DiagnosticResult
from app.models.remediation import RemediationAction
from sqlalchemy import select


def test_simulation_engine_initial_and_remediated_state():
    """Tests the deterministic simulation engine fault state and transition to healthy."""
    simulation_engine.reset_to_default_vpn_fault("CORP-LAPTOP-042")

    # Initial fault state
    dns = simulation_engine.query_dns("vpn.corporate.internal", "CORP-LAPTOP-042")
    assert dns["is_stale"] is True
    assert dns["resolved_ip"] == "10.0.4.1"

    ping = simulation_engine.ping_target("10.0.4.1", "CORP-LAPTOP-042")
    assert ping["reachable"] is False
    assert ping["packet_loss_percent"] == 100

    adapter = simulation_engine.check_adapter("CORP-LAPTOP-042")
    assert adapter["state"] == "DISCONNECTED"

    # Remediate via simulation
    simulation_engine.flush_dns("CORP-LAPTOP-042")
    simulation_engine.restart_vpn_svc("CORP-LAPTOP-042")

    # Post-remediation state
    dns_fixed = simulation_engine.query_dns("vpn.corporate.internal", "CORP-LAPTOP-042")
    assert dns_fixed["is_stale"] is False
    assert dns_fixed["resolved_ip"] == "10.0.4.50"

    ping_fixed = simulation_engine.ping_target("10.0.4.50", "CORP-LAPTOP-042")
    assert ping_fixed["reachable"] is True
    assert ping_fixed["packet_loss_percent"] == 0

    adapter_fixed = simulation_engine.check_adapter("CORP-LAPTOP-042")
    assert adapter_fixed["state"] == "CONNECTED"


def test_tool_registry_security_and_bounds():
    """Tests zero-arbitrary execution enforcement and parameter bounds."""
    # Unauthorized tool call
    with pytest.raises(ValueError, match="Unauthorized tool"):
        ToolDispatcher.execute_tool("arbitrary_bash_command", {"command": "rm -rf /"})

    # Parameter injection attack
    with pytest.raises(ValueError, match="Malicious metacharacters"):
        ToolDispatcher.execute_tool("resolve_dns", {"host": "vpn.corp; rm -rf /"})

    # Validate safety tier tagging
    meta_flush = ToolDispatcher.get_tool_metadata("flush_dns_cache")
    assert meta_flush["safety_tier"] == TIER_1_SAFE

    meta_restart = ToolDispatcher.get_tool_metadata("restart_vpn_service")
    assert meta_restart["safety_tier"] == TIER_2_PRIVILEGED


@pytest.mark.asyncio
async def test_full_day3_diagnostics_approval_and_verification_loop():
    """Tests complete Day 3 autonomous lifecycle:
    1. Incident ingested and auto-triaged to INVESTIGATING.
    2. Diagnostics run -> Stale DNS found -> flush_dns executed -> restart_vpn requested.
    3. Status transitions to AWAITING_APPROVAL.
    4. Admin approves privileged action.
    5. Closed-loop verification re-runs diagnostics.
    6. All healthy -> Ticket RESOLVED!
    """
    await init_db()
    simulation_engine.reset_to_default_vpn_fault("CORP-LAPTOP-042")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Submit ticket
        submit_res = await client.post(
            "/api/v1/incidents/?auto_triage=true",
            json={
                "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "device_id": "CORP-LAPTOP-042",
                "os_type": "Windows 11",
                "raw_description": "My corporate AnyConnect VPN will not connect to gateway 10.0.4.1.",
            },
        )
        assert submit_res.status_code == 201
        ticket_no = submit_res.json()["ticket_number"]

        # Step 2: Trigger Diagnostics
        diag_res = await client.post(f"/api/v1/incidents/{ticket_no}/diagnose")
        assert diag_res.status_code == 200
        diag_data = diag_res.json()

        assert diag_data["status"] == "AWAITING_APPROVAL"
        assert "Confirmed Root Cause" in diag_data["root_cause"]
        assert diag_data["pending_approval"]["action_name"] == "restart_vpn_service"
        approval_id = diag_data["pending_approval"]["id"]

        # Step 3: Verify DB records for Diagnostics & Approval
        async with AsyncSessionLocal() as session:
            diags = (
                await session.execute(
                    select(DiagnosticResult).join(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalars().all()
            assert len(diags) >= 3

            remeds = (
                await session.execute(
                    select(RemediationAction).join(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalars().all()
            assert len(remeds) >= 1  # flush_dns_cache executed
            assert remeds[0].tool_name == "flush_dns_cache"

        # Step 4: Admin Approves the Action
        approval_res = await client.post(
            f"/api/v1/approvals/{approval_id}/decision",
            json={
                "decision": "APPROVED",
                "admin_notes": "Authorized service restart to complete gateway migration.",
            },
        )
        assert approval_res.status_code == 200
        appr_data = approval_res.json()

        assert appr_data["status"] == "RESOLVED"
        assert "Autonomous Remediation Verified" in appr_data["resolution_summary"]

        # Step 5: Verify Final Closed Incident State in DB
        async with AsyncSessionLocal() as session:
            final_inc = (
                await session.execute(
                    select(Incident).where(Incident.ticket_number == ticket_no)
                )
            ).scalar_one_or_none()

            assert final_inc.status == "RESOLVED"
            assert final_inc.resolved_at is not None
            assert "Tunnel Active" in final_inc.current_step

