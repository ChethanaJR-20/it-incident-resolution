"""Tool allowlist registry, safety classification, and dispatcher."""

from typing import Dict, Any, Callable
from app.tools.diagnostics import (
    check_vpn_adapter_status,
    resolve_dns,
    ping_gateway,
    check_service_status,
)
from app.tools.remediations import (
    flush_dns_cache,
    reset_virtual_adapter,
    restart_vpn_service,
)

# Safety Tiers:
# TIER_1_SAFE: Non-destructive, read-only diagnostic or safe cache flush (can be auto-executed).
# TIER_2_PRIVILEGED: Modifies daemon states or system services (REQUIRES IT Admin approval).
TIER_1_SAFE = "TIER_1_SAFE"
TIER_2_PRIVILEGED = "TIER_2_PRIVILEGED"

TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Diagnostic Tools
    "check_vpn_adapter_status": {
        "function": check_vpn_adapter_status,
        "type": "DIAGNOSTIC",
        "safety_tier": TIER_1_SAFE,
        "description": "Checks whether the VPN virtual adapter is CONNECTED or DISCONNECTED.",
    },
    "resolve_dns": {
        "function": resolve_dns,
        "type": "DIAGNOSTIC",
        "safety_tier": TIER_1_SAFE,
        "description": "Resolves hostname to IP to detect stale cache records.",
    },
    "ping_gateway": {
        "function": ping_gateway,
        "type": "DIAGNOSTIC",
        "safety_tier": TIER_1_SAFE,
        "description": "Tests IP packet reachability and latency against target gateway.",
    },
    "check_service_status": {
        "function": check_service_status,
        "type": "DIAGNOSTIC",
        "safety_tier": TIER_1_SAFE,
        "description": "Inspects status of local background services.",
    },
    # Remediation Tools
    "flush_dns_cache": {
        "function": flush_dns_cache,
        "type": "REMEDIATION",
        "safety_tier": TIER_1_SAFE,
        "description": "Flushes the local OS resolver cache to re-bind correct gateway IPs.",
    },
    "reset_virtual_adapter": {
        "function": reset_virtual_adapter,
        "type": "REMEDIATION",
        "safety_tier": TIER_1_SAFE,
        "description": "Resets the virtual adapter interface driver.",
    },
    "restart_vpn_service": {
        "function": restart_vpn_service,
        "type": "REMEDIATION",
        "safety_tier": TIER_2_PRIVILEGED,
        "description": "Restarts the Cisco AnyConnect daemon service (Privileged - Requires Human Approval).",
    },
}


class ToolDispatcher:
    @staticmethod
    def get_tool_metadata(tool_name: str) -> Dict[str, Any]:
        if tool_name not in TOOL_REGISTRY:
            raise ValueError(f"Security Alert: Unauthorized tool invocation '{tool_name}'. Not in allowlist registry.")
        return TOOL_REGISTRY[tool_name]

    @staticmethod
    def execute_tool(tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Safely executes an allowlisted tool function with bounded parameters."""
        meta = ToolDispatcher.get_tool_metadata(tool_name)
        func: Callable = meta["function"]

        # Whitelist and sanitize parameter keys
        allowed_param_keys = {"device_id", "host", "ip", "service_name"}
        sanitized_params = {k: v for k, v in params.items() if k in allowed_param_keys}

        # Parameter value bounds checking (reject injection characters)
        for val in sanitized_params.values():
            if isinstance(val, str) and any(char in val for char in [";", "&&", "|", "`", "$"]):
                raise ValueError("Security Alert: Malicious metacharacters detected in tool arguments.")

        return func(**sanitized_params)

