"""Allowlisted Diagnostic Tools executing against the simulated telemetry engine."""

from typing import Dict, Any
from app.services.simulation_engine import simulation_engine


def check_vpn_adapter_status(device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Queries the operational state of the virtual network adapter driver."""
    return simulation_engine.check_adapter(device_id)


def resolve_dns(host: str = "vpn.corporate.internal", device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Tests DNS resolution for corporate hostnames against local and internal resolvers."""
    return simulation_engine.query_dns(host, device_id)


def ping_gateway(ip: str = "10.0.4.1", device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Sends ICMP echo request packets to verify network gateway connectivity."""
    return simulation_engine.ping_target(ip, device_id)


def check_service_status(service_name: str = "vpn_service", device_id: str = "CORP-LAPTOP-042") -> Dict[str, Any]:
    """Inspects whether a local background daemon or helper service is running."""
    return simulation_engine.check_service(service_name, device_id)

