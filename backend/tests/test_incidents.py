import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """Verifies that the health check endpoint returns 200 OK."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True


@pytest.mark.asyncio
async def test_submit_incident_success(client):
    """Tests employee incident submission creates a ticket with status SUBMITTED."""
    payload = {
        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "device_id": "CORP-LAPTOP-042",
        "os_type": "Windows 11",
        "raw_description": "My corporate AnyConnect VPN will not connect. Gateway 10.0.4.1 unreachable.",
    }
    response = await client.post("/api/v1/incidents/", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["ticket_number"].startswith("INC-")
    assert data["status"] == "SUBMITTED"
    assert data["device_id"] == "CORP-LAPTOP-042"
    assert "Gateway 10.0.4.1 unreachable" in data["raw_description"]


@pytest.mark.asyncio
async def test_submit_incident_validation_error(client):
    """Tests that an overly short description triggers a 422 Unprocessable Entity."""
    payload = {
        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "device_id": "CORP-LAPTOP-042",
        "os_type": "Windows 11",
        "raw_description": "help",  # Too short (min_length=10)
    }
    response = await client.post("/api/v1/incidents/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_incident_detail(client):
    """Tests retrieving full incident details by ticket number."""
    # First create
    create_payload = {
        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "device_id": "CORP-LAPTOP-042",
        "os_type": "Windows 11",
        "raw_description": "My DNS cache seems corrupted; cannot reach git repo.",
    }
    create_res = await client.post("/api/v1/incidents/", json=create_payload)
    ticket_num = create_res.json()["ticket_number"]

    # Now get
    get_res = await client.get(f"/api/v1/incidents/{ticket_num}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["ticket_number"] == ticket_num
    assert data["status"] == "SUBMITTED"
    assert "git repo" in data["raw_description"]

