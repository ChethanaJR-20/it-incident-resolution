from fastapi import APIRouter, Query
from app.services.simulation_engine import simulation_engine

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post("/reset")
async def reset_simulation(device_id: str = Query("CORP-LAPTOP-042")):
    """Resets the simulated hardware and network environment to the default VPN failure state."""
    simulation_engine.reset_to_default_vpn_fault(device_id)
    return {
        "status": "RESET_SUCCESSFUL",
        "device_id": device_id,
        "active_faults": simulation_engine.get_device_state(device_id)["active_faults"],
        "message": "Environment successfully reset to Golden Path fault state: Stale DNS 10.0.4.1, unreachable gateway.",
    }


@router.get("/state")
async def get_simulation_state(device_id: str = Query("CORP-LAPTOP-042")):
    """Inspects the live telemetry state of a simulated endpoint device."""
    return simulation_engine.get_device_state(device_id)


@router.post("/benchmark")
async def run_benchmark():
    """Day 5: Executes full model evaluation benchmark across all 15 synthetic incident scenarios."""
    return simulation_engine.run_benchmark_evaluation()


