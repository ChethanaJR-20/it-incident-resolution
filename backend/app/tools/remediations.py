"""Allowlisted Controlled Remediation Tools modifying system and network states."""

from typing import Dict, Any
from app.services.simulation_engine import simulation_engine


def flush_dns_cache(device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Clears local operating system DNS resolver cache (Tier 1 - Safe)."""
    return simulation_engine.flush_dns(device_id)


def reset_virtual_adapter(device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Re-initializes the virtual network interface miniport driver (Tier 1 - Safe)."""
    return simulation_engine.reset_adapter(device_id)


def restart_vpn_service(device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Restarts the background Cisco AnyConnect VPN daemon (Tier 2 - Privileged, Requires Admin Approval)."""
    return simulation_engine.restart_vpn_svc(device_id)

