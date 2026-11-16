from typing import Optional
from pydantic import BaseModel, Field


class ApprovalDecision(BaseModel):
    """Payload for administrator approving or rejecting a privileged remediation."""
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$", description="Decision: APPROVED or REJECTED")
    admin_notes: Optional[str] = Field(None, max_length=500, description="Optional notes from IT Administrator")
    reviewed_by: Optional[str] = Field(None, description="Admin employee ID")

