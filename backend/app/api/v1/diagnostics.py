"""Interactive Diagnostics Lab and Manual Troubleshooting API router."""

import time
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter
from app.services.simulation_engine import simulation_engine

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics Lab"])

# Diagnostic Probe Catalog with plain-language explanations
PROBES_CATALOG = [
    {
        "id": "ping_gateway",
        "name": "Network Gateway Ping Probe",
        "category": "Network Connectivity",
        "risk_level": "SAFE",
        "plain_language_meaning": "Tests whether your computer can physically send and receive data packets from the local office network router.",
        "real_command": "ping 10.0.4.1 -n 4",
        "what_it_checks": "Tests network interface hardware, local cable/Wi-Fi connection, packet drop percentage, and round-trip latency.",
        "normal_output": "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss), Average = 18ms",
        "failure_output": "Request timed out. Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)",
        "parameter_label": "Target IP Address",
        "default_parameter": "10.0.4.1",
        "sample_healthy_param": "10.0.4.50",
    },
    {
        "id": "query_dns_resolution",
        "name": "DNS Name Resolution Probe",
        "category": "DNS & Routing",
        "risk_level": "SAFE",
        "plain_language_meaning": "Checks whether your computer knows the correct current IP address (phone number) for corporate websites and VPN gateways.",
        "real_command": "nslookup vpn.corporate.internal",
        "what_it_checks": "Inspects local DNS resolver cache, compares returned IP with authoritative company records, and catches stale decommissioned IP addresses.",
        "normal_output": "Server: 10.0.0.2 Address: 10.0.0.2#53 Non-authoritative answer: Name: vpn.corporate.internal Address: 10.0.4.50",
        "failure_output": "Name: vpn.corporate.internal Address: 10.0.4.1 (STALE DECOMMISSIONED IP)",
        "parameter_label": "Hostname to Resolve",
        "default_parameter": "vpn.corporate.internal",
        "sample_healthy_param": "code.internal",
    },
    {
        "id": "check_vpn_service_status",
        "name": "Background VPN Daemon Probe",
        "category": "Service Health",
        "risk_level": "SAFE",
        "plain_language_meaning": "Checks if the background system security service (Cisco AnyConnect / Pulse Secure) is currently running or silently crashed.",
        "real_command": 'Get-Service -Name "vpnagent" | Select-Object Status, DisplayName',
        "what_it_checks": "Verifies process existence in Windows Service Control Manager, PID allocation, and thread responsiveness.",
        "normal_output": "Status: Running  DisplayName: Cisco AnyConnect Secure Mobility Agent (PID: 4892)",
        "failure_output": "Status: Stopped  DisplayName: Cisco AnyConnect Secure Mobility Agent (Process exited unexpectedly)",
        "parameter_label": "Service Name",
        "default_parameter": "vpn_service",
        "sample_healthy_param": "dns_resolver",
    },
    {
        "id": "check_network_adapter",
        "name": "Virtual Network Adapter Driver Probe",
        "category": "Hardware & Drivers",
        "risk_level": "SAFE",
        "plain_language_meaning": "Inspects whether the virtual network card driver inside Windows is active or locked up with error 502.",
        "real_command": 'Get-NetAdapter -Name "*VPN*" | Select-Object Status, InterfaceDescription',
        "what_it_checks": "Queries NDIS virtual miniport driver operational status and detects failed driver initializations.",
        "normal_output": "Status: Up  InterfaceDescription: Cisco AnyConnect Virtual Miniport Adapter for Windows",
        "failure_output": "Status: Disconnected / Error 502  InterfaceDescription: Miniport driver failed to bind",
        "parameter_label": "Device Hostname",
        "default_parameter": "CORP-LAPTOP-042",
        "sample_healthy_param": "CORP-LAPTOP-042",
    },
    {
        "id": "check_tcp_port",
        "name": "Corporate Gateway Port Probe",
        "category": "Firewall & Security",
        "risk_level": "SAFE",
        "plain_language_meaning": "Tests if the remote corporate firewall is accepting secure connections on port 443 (SSL/TLS).",
        "real_command": "Test-NetConnection -ComputerName 10.0.4.50 -Port 443",
        "what_it_checks": "Sends a TCP SYN packet to verify whether the firewall or VPN concentrator socket is open and listening.",
        "normal_output": "TcpTestSucceeded : True  RemoteAddress : 10.0.4.50  RemotePort : 443",
        "failure_output": "TcpTestSucceeded : False  RemoteAddress : 10.0.4.1  RemotePort : 443 (Filter Block / No Route)",
        "parameter_label": "Target Host/IP",
        "default_parameter": "10.0.4.1",
        "sample_healthy_param": "10.0.4.50",
    },
    {
        "id": "check_system_resources",
        "name": "Endpoint Resource & Memory Probe",
        "category": "System Performance",
        "risk_level": "SAFE",
        "plain_language_meaning": "Measures CPU load, free memory, and hard drive storage to ensure the laptop is not frozen or completely out of disk space.",
        "real_command": "Get-Process | Sort-Object CPU -Descending | Select-Object -First 5",
        "what_it_checks": "System RAM usage, CPU saturation, disk I/O bottlenecks, and rogue processes.",
        "normal_output": "CPU Load: 14% | Free RAM: 62% (9.8 GB available) | Free Disk: 142 GB (Healthy)",
        "failure_output": "CPU Load: 99% | Free RAM: 2% (Thrashing) | High CPU process: AnyConnect.exe (Hung)",
        "parameter_label": "Device Hostname",
        "default_parameter": "CORP-LAPTOP-042",
        "sample_healthy_param": "CORP-LAPTOP-042",
    },
]

# Quick 1-Click Remediation Actions Catalog
REMEDIATION_CATALOG = [
    {
        "id": "flush_dns",
        "name": "Flush Local DNS Resolver Cache",
        "type": "SAFE_REMEDIATION",
        "risk_level": "Tier-1 Safe (Zero Downtime)",
        "plain_language_meaning": "Purges all outdated and stale IP records stored on the laptop, forcing Windows to look up brand-new addresses from the corporate server.",
        "real_command": "ipconfig /flushdns",
        "when_to_use": "When websites or VPN fail after network changes or server migration.",
    },
    {
        "id": "reset_adapter",
        "name": "Reset Virtual Network Adapter",
        "type": "SAFE_REMEDIATION",
        "risk_level": "Tier-1 Safe (Zero Downtime)",
        "plain_language_meaning": "Disables and re-enables the software network adapter driver, clearing stuck memory buffers without restarting the computer.",
        "real_command": 'Restart-NetAdapter -Name "Cisco AnyConnect" -Confirm:$false',
        "when_to_use": "When the VPN shows 'Virtual adapter driver failed to initialize' (Error 502).",
    },
    {
        "id": "restart_service",
        "name": "Restart Background VPN Service",
        "type": "PRIVILEGED_REMEDIATION",
        "risk_level": "Tier-2 Privileged (Human Approval Required in Production)",
        "plain_language_meaning": "Forcefully restarts the system-level daemon responsible for encrypted network routing.",
        "real_command": 'Restart-Service -Name "vpnagent" -Force',
        "when_to_use": "When the VPN daemon has crashed or is in a STOPPED state.",
    },
]


class ProbeExecuteRequest(BaseModel):
    probe_id: str = Field(..., description="ID of the probe to execute")
    target: Optional[str] = Field(None, description="Optional target parameter (IP, host, or service)")
    device_id: str = Field("CORP-LAPTOP-042", description="Target device ID")


class RemediationExecuteRequest(BaseModel):
    remediation_id: str = Field(..., description="ID of the remediation tool to run")
    device_id: str = Field("CORP-LAPTOP-042", description="Target device ID")


@router.get("/probes")
async def list_probes():
    """Returns the comprehensive manual diagnostic probe catalog with plain-language descriptions."""
    state = simulation_engine.get_device_state("CORP-LAPTOP-042")
    return {
        "device_id": "CORP-LAPTOP-042",
        "active_faults": state.get("active_faults", []),
        "probes": PROBES_CATALOG,
        "remediations": REMEDIATION_CATALOG,
    }


@router.post("/execute")
async def execute_probe(payload: ProbeExecuteRequest):
    """Executes a diagnostic probe against the endpoint and returns raw CLI output + plain-language explanation."""
    start_t = time.time()
    device_id = payload.device_id or "CORP-LAPTOP-042"
    target = payload.target
    probe_id = payload.probe_id

    # Find probe definition
    probe_meta = next((p for p in PROBES_CATALOG if p["id"] == probe_id), None)
    if not probe_meta:
        return {"status": "ERROR", "message": f"Unknown probe {probe_id}"}

    raw_output = ""
    status = "SUCCESS"
    plain_result = ""
    is_healthy = True

    if probe_id == "ping_gateway":
        ip = target or probe_meta["default_parameter"]
        res = simulation_engine.ping_target(ip, device_id)
        is_healthy = res.get("reachable", False)
        status = "HEALTHY" if is_healthy else "FAILURE_DETECTED"
        if is_healthy:
            raw_output = f"Pinging {ip} with 32 bytes of data:\nReply from {ip}: bytes=32 time={res.get('latency_ms', 18)}ms TTL=64\nReply from {ip}: bytes=32 time={res.get('latency_ms', 18)}ms TTL=64\n\nPing statistics for {ip}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
            plain_result = f"Gateway at {ip} is online and responding in {res.get('latency_ms', 18)}ms. Hardware connection is good."
        else:
            raw_output = f"Pinging {ip} with 32 bytes of data:\nRequest timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n\nPing statistics for {ip}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)"
            plain_result = f"Destination gateway {ip} is unreachable (100% packet loss). This IP address is offline or decommissioned."

    elif probe_id == "query_dns_resolution":
        host = target or probe_meta["default_parameter"]
        res = simulation_engine.query_dns(host, device_id)
        resolved = res.get("resolved_ip", "0.0.0.0")
        expected = res.get("expected_ip", resolved)
        is_stale = res.get("is_stale", False)
        is_healthy = not is_stale
        status = "HEALTHY" if is_healthy else "FAILURE_DETECTED"
        if is_healthy:
            raw_output = f"Server:  internal-dns.corp.local\nAddress:  10.0.0.2\n\nNon-authoritative answer:\nName:    {host}\nAddress: {resolved}"
            plain_result = f"DNS resolution for '{host}' succeeded. Correct active IP ({resolved}) is mapped."
        else:
            raw_output = f"Server:  internal-dns.corp.local\nAddress:  10.0.0.2\n\nCached answer:\nName:    {host}\nAddress: {resolved}  [WARNING: STALE ENTRY - Decommissioned IP]"
            plain_result = f"DNS record is STALE. The laptop points '{host}' to decommissioned IP {resolved} instead of the active gateway {expected}."

    elif probe_id == "check_vpn_service_status":
        svc = target or probe_meta["default_parameter"]
        res = simulation_engine.check_service(svc, device_id)
        svc_state = res.get("service_state", "UNKNOWN")
        is_healthy = (svc_state == "RUNNING")
        status = "HEALTHY" if is_healthy else "FAILURE_DETECTED"
        if is_healthy:
            raw_output = f"Status   Name               DisplayName\n------   ----               -----------\nRunning  {svc}         Cisco AnyConnect Secure Mobility Agent (PID 4892)"
            plain_result = f"The background security service '{svc}' is ACTIVE and healthy."
        else:
            raw_output = f"Status   Name               DisplayName\n------   ----               -----------\nStopped  {svc}         Cisco AnyConnect Secure Mobility Agent (Process Exited with code 0)"
            plain_result = f"The background security service '{svc}' is STOPPED. The VPN client cannot establish secure sessions while this is halted."

    elif probe_id == "check_network_adapter":
        res = simulation_engine.check_adapter(device_id)
        adapter_state = res.get("adapter_status", "UNKNOWN")
        is_healthy = (adapter_state == "CONNECTED")
        status = "HEALTHY" if is_healthy else "FAILURE_DETECTED"
        if is_healthy:
            raw_output = f"Name                      InterfaceDescription                    Status       MacAddress\n----                      --------------------                    ------       ----------\nCisco AnyConnect Miniport Cisco AnyConnect Virtual Miniport v4.0  Up           00-05-9A-3C-78-00"
            plain_result = "Virtual network interface miniport driver is UP and bound correctly."
        else:
            raw_output = f"Name                      InterfaceDescription                    Status       MacAddress\n----                      --------------------                    ------       ----------\nCisco AnyConnect Miniport Cisco AnyConnect Virtual Miniport v4.0  Disconnected 00-05-9A-3C-78-00\n[Driver Alert]: Error 502 - Virtual network adapter failed to initialize"
            plain_result = f"Virtual network adapter driver is {adapter_state}. Needs reset or re-binding."

    elif probe_id == "check_tcp_port":
        ip = target or probe_meta["default_parameter"]
        res = simulation_engine.ping_target(ip, device_id)
        is_healthy = res.get("reachable", False)
        status = "HEALTHY" if is_healthy else "FAILURE_DETECTED"
        if is_healthy:
            raw_output = f"ComputerName     : {ip}\nRemoteAddress    : {ip}\nRemotePort       : 443\nInterfaceAlias   : Wi-Fi\nSourceAddress    : 192.168.1.105\nTcpTestSucceeded : True"
            plain_result = f"TCP port 443 on {ip} is OPEN and accepting incoming SSL handshakes."
        else:
            raw_output = f"WARNING: TCP connect to ({ip} : 443) failed\nComputerName     : {ip}\nRemoteAddress    : {ip}\nRemotePort       : 443\nInterfaceAlias   : Wi-Fi\nSourceAddress    : 192.168.1.105\nTcpTestSucceeded : False"
            plain_result = f"Cannot establish TCP handshake with {ip}:443. Traffic is blocked or destination host is unreachable."

    elif probe_id == "check_system_resources":
        is_healthy = True
        status = "HEALTHY"
        raw_output = "Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id ProcessName\n-------  ------    -----      -----     ------     -- -----------\n    412      24    38492      48200       1.24   4892 AnyConnect\n    620      42    82910     112400       2.15   1204 chrome\n\nCPU Load: 12% | Free Physical RAM: 9,420 MB / 16,384 MB (57% Free) | Free Disk: 142 GB on C:"
        plain_result = "System hardware utilization is optimal. Sufficient RAM and disk space available."

    elapsed_ms = int((time.time() - start_t) * 1000)

    return {
        "probe_id": probe_id,
        "name": probe_meta["name"],
        "category": probe_meta["category"],
        "command_executed": probe_meta["real_command"],
        "target": target or probe_meta["default_parameter"],
        "is_healthy": is_healthy,
        "status": status,
        "latency_ms": max(elapsed_ms, 12),
        "raw_terminal_output": raw_output,
        "plain_language_interpretation": plain_result,
        "current_device_state": simulation_engine.get_device_state(device_id),
    }


@router.post("/remediate")
async def execute_remediation(payload: RemediationExecuteRequest):
    """Executes a diagnostic-guided remediation and returns the before/after change in device state."""
    device_id = payload.device_id or "CORP-LAPTOP-042"
    rem_id = payload.remediation_id

    rem_meta = next((r for r in REMEDIATION_CATALOG if r["id"] == rem_id), None)
    if not rem_meta:
        return {"status": "ERROR", "message": f"Unknown remediation {rem_id}"}

    result = {}
    if rem_id == "flush_dns":
        result = simulation_engine.flush_dns(device_id)
    elif rem_id == "reset_adapter":
        result = simulation_engine.reset_adapter(device_id)
    elif rem_id == "restart_service":
        result = simulation_engine.restart_vpn_svc(device_id)

    updated_state = simulation_engine.get_device_state(device_id)

    return {
        "status": "REMEDIATION_APPLIED",
        "remediation_id": rem_id,
        "name": rem_meta["name"],
        "command_executed": rem_meta["real_command"],
        "plain_language_explanation": rem_meta["plain_language_meaning"],
        "result": result,
        "active_faults_remaining": updated_state.get("active_faults", []),
    }


@router.post("/reset-environment")
async def reset_environment(device_id: str = "CORP-LAPTOP-042"):
    """Resets the endpoint device to the default broken state so users can test again."""
    simulation_engine.reset_to_default_vpn_fault(device_id)
    return {
        "status": "ENVIRONMENT_RESET",
        "device_id": device_id,
        "active_faults": simulation_engine.get_device_state(device_id)["active_faults"],
        "message": "Endpoint CORP-LAPTOP-042 successfully reset to fault state (Stale DNS, unreachable gateway, stopped service).",
    }
