from typing import List
from pydantic import BaseModel, Field


class IncidentClassificationOutput(BaseModel):
    """Structured Pydantic schema enforced for Gemini classification output."""
    category: str = Field(
        ...,
        description="Primary IT issue category. Allowed: VPN, NETWORK, DNS, AUTH, SOFTWARE, HARDWARE, APP_ACCESS, OTHER",
    )
    sub_category: str = Field(
        ...,
        description="Specific problem area, e.g. gateway_timeout, adapter_failure, password_lockout, dns_cache",
    )
    priority: str = Field(
        ...,
        description="Assigned ITIL priority: P1 (Critical Outage), P2 (High Impact), P3 (Medium), P4 (Low)",
    )
    severity: str = Field(
        ...,
        description="Operational severity: LOW, MEDIUM, HIGH, CRITICAL",
    )
    extracted_symptoms: List[str] = Field(
        ...,
        description="Extracted key technical symptoms, error codes, and failure indicators",
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence between 0.0 and 1.0",
    )
    reasoning: str = Field(
        ...,
        description="Short 1-2 sentence technical deduction explaining the triage decision",
    )

