"""Gemini API client interface supporting structured outputs and deterministic fallback."""

import json
import logging
import re
from typing import Optional, Dict, Any

from app.config import settings
from app.schemas.classification import IncidentClassificationOutput
from app.agent.prompts import CLASSIFICATION_SYSTEM_PROMPT, INVESTIGATION_SYSTEM_PROMPT

logger = logging.getLogger("agent.gemini")


class GeminiAgentClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._is_live_key = (
            bool(self.api_key)
            and self.api_key != "PASTE_MY_GEMINI_API_KEY_HERE"
            and not self.api_key.startswith("YOUR_")
        )
        self._client = None

        if self._is_live_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info(f"Initialized live Google Gemini client with model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI SDK client: {e}. Using deterministic fallback.")
                self._client = None

    async def classify_incident(self, raw_description: str, device_id: str, os_type: str) -> IncidentClassificationOutput:
        """Classifies an employee IT incident into structured categories, severity, and symptoms."""
        # If live Gemini client is ready, call Gemini with structured outputs
        if self._client:
            try:
                from google.genai import types

                prompt = (
                    f"{CLASSIFICATION_SYSTEM_PROMPT}\n\n"
                    f"Device Context:\n"
                    f"- Device ID: {device_id}\n"
                    f"- Operating System: {os_type}\n\n"
                    f"Employee Complaint:\n"
                    f"<employee_complaint>\n"
                    f"{raw_description}\n"
                    f"</employee_complaint>"
                )

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=IncidentClassificationOutput,
                        temperature=0.1,
                    ),
                )

                if response.text:
                    parsed_json = json.loads(response.text)
                    return IncidentClassificationOutput(**parsed_json)
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Falling back to deterministic triage engine.")

        # Deterministic fallback engine (guarantees 100% testability and zero downtime)
        return self._fallback_classify(raw_description)

    async def formulate_investigation_plan(
        self,
        classification: IncidentClassificationOutput,
        raw_description: str,
        runbook_title: str,
        allowable_tools: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Synthesizes symptoms with the retrieved runbook to generate an actionable investigation plan."""
        if self._client:
            try:
                prompt = (
                    f"{INVESTIGATION_SYSTEM_PROMPT}\n\n"
                    f"Incident Category: {classification.category} ({classification.sub_category})\n"
                    f"Reported Symptoms: {', '.join(classification.extracted_symptoms)}\n"
                    f"Employee Complaint: {raw_description}\n\n"
                    f"Matched Runbook: {runbook_title}\n"
                    f"Allowable Tools: {json.dumps(allowable_tools)}\n\n"
                    f"Provide a JSON response with fields:\n"
                    f"- hypothesis (string)\n"
                    f"- finding_type ('CONFIRMED_FINDING' or 'POSSIBLE_HYPOTHESIS')\n"
                    f"- initial_diagnostic_tool (string from allowable diagnostics)\n"
                    f"- investigation_summary (string)"
                )

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )
                if response.text:
                    return json.loads(response.text)
            except Exception as e:
                logger.error(f"Gemini investigation call failed: {e}. Using deterministic plan.")

        # Deterministic investigation plan
        return self._fallback_investigation_plan(classification, allowable_tools)

    def _fallback_classify(self, text: str) -> IncidentClassificationOutput:
        """Deterministic semantic rule classifier matching patterns in synthetic enterprise tickets."""
        lower = text.lower()

        # VPN Detection
        if any(w in lower for w in ["vpn", "anyconnect", "gateway", "virtual adapter", "tunnel"]):
            if "virtual adapter" in lower or "502" in lower:
                return IncidentClassificationOutput(
                    category="VPN",
                    sub_category="adapter_driver_failure",
                    priority="P2",
                    severity="HIGH",
                    extracted_symptoms=["virtual_adapter_hung", "driver_error_502", "tunnel_uninitialized"],
                    confidence_score=0.98,
                    reasoning="Employee reported virtual network adapter failure 502 preventing tunnel initialization.",
                )
            else:
                return IncidentClassificationOutput(
                    category="VPN",
                    sub_category="gateway_timeout",
                    priority="P2",
                    severity="HIGH",
                    extracted_symptoms=["vpn_disconnected", "gateway_unreachable", "stale_gateway_ip"],
                    confidence_score=0.99,
                    reasoning="Employee unable to connect to corporate VPN gateway; general internet browsing is operational.",
                )

        # DNS Detection
        if any(w in lower for w in ["dns", "resolve", "code.internal", "payroll.corp", "nameserver"]):
            return IncidentClassificationOutput(
                category="DNS",
                sub_category="hostname_resolution_failure",
                priority="P3",
                severity="MEDIUM",
                extracted_symptoms=["dns_probe_timeout", "internal_host_unreachable", "nameserver_unresponsive"],
                confidence_score=0.96,
                reasoning="Internal domain name resolution failed for corporate intranet while external web works.",
            )

        # Auth & SSO
        if any(w in lower for w in ["locked out", "sso", "saml", "password", "active directory", "token expired"]):
            return IncidentClassificationOutput(
                category="AUTH",
                sub_category="sso_token_expiration",
                priority="P2",
                severity="HIGH",
                extracted_symptoms=["saml_token_expired", "active_directory_lockout", "session_invalid"],
                confidence_score=0.95,
                reasoning="Single Sign-On authentication session invalidated or domain account lockout exceeded.",
            )

        # Network / DHCP
        if any(w in lower for w in ["wi-fi", "wifi", "no internet", "dhcp", "ip conflict"]):
            return IncidentClassificationOutput(
                category="NETWORK",
                sub_category="dhcp_lease_expired",
                priority="P2",
                severity="HIGH",
                extracted_symptoms=["no_internet_secured", "dhcp_expired", "local_link_loss"],
                confidence_score=0.94,
                reasoning="Local wireless adapter reports No Internet, Secured indicating DHCP renewal failure.",
            )

        # Software / Crash
        if any(w in lower for w in ["crash", "slack", "docker", "wsl", "exception"]):
            return IncidentClassificationOutput(
                category="SOFTWARE",
                sub_category="local_service_crash",
                priority="P3",
                severity="LOW",
                extracted_symptoms=["process_crash", "service_stopped", "corrupted_cache"],
                confidence_score=0.92,
                reasoning="Application terminated unexpectedly due to background daemon halt or corrupted local state.",
            )

        # Hardware / Printer
        if any(w in lower for w in ["printer", "print", "spooler", "monitor", "flicker"]):
            return IncidentClassificationOutput(
                category="HARDWARE",
                sub_category="peripheral_spooler_hung",
                priority="P4",
                severity="LOW",
                extracted_symptoms=["print_queue_deadlock", "driver_handshake_timeout"],
                confidence_score=0.90,
                reasoning="Peripheral device communication stalled in OS subsystem queue.",
            )

        # Default fallback
        return IncidentClassificationOutput(
            category="OTHER",
            sub_category="general_it_issue",
            priority="P3",
            severity="MEDIUM",
            extracted_symptoms=["general_system_fault"],
            confidence_score=0.80,
            reasoning="Unclassified IT support request requiring general technician triage.",
        )

    def _fallback_investigation_plan(
        self,
        classification: IncidentClassificationOutput,
        allowable_tools: Dict[str, Any],
    ) -> Dict[str, Any]:
        diag_tools = allowable_tools.get("diagnostics", ["check_vpn_adapter_status"])
        initial_tool = diag_tools[0] if diag_tools else "check_vpn_adapter_status"

        if classification.category == "VPN":
            return {
                "hypothesis": "Local DNS resolver is holding decommissioned gateway IP 10.0.4.1 or virtual adapter driver is hung.",
                "finding_type": "POSSIBLE_HYPOTHESIS",
                "initial_diagnostic_tool": "resolve_dns",
                "investigation_summary": "Query corporate VPN gateway DNS resolution followed by virtual adapter driver status probe.",
            }
        elif classification.category == "DNS":
            return {
                "hypothesis": "Operating system resolver cache contains stale mapping or corporate DNS binding is invalid.",
                "finding_type": "POSSIBLE_HYPOTHESIS",
                "initial_diagnostic_tool": "resolve_dns",
                "investigation_summary": "Execute DNS lookup probe against target corporate hostname.",
            }
        else:
            return {
                "hypothesis": f"Suspected operational fault in {classification.category} subsystem.",
                "finding_type": "POSSIBLE_HYPOTHESIS",
                "initial_diagnostic_tool": initial_tool,
                "investigation_summary": f"Initiate standard diagnostic probes for {classification.category}.",
            }

