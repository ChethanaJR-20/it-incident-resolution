from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class IncidentCreate(BaseModel):
    """Schema for employee ticket intake form."""
    employee_id: str = Field(..., description="UUID of reporting employee")
    device_id: str = Field(..., min_length=2, max_length=100, description="Hostname/Device ID (e.g. CORP-LAPTOP-042)")
    os_type: str = Field("Windows 11", description="Operating system")
    raw_description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Employee complaint described in natural language",
        examples=["My VPN is not connecting. It says failed to reach gateway 10.0.4.1."],
    )
    is_emergency: bool = Field(False, description="Emergency Fast-Track flag (e.g. critical meeting starting in 5 mins)")
    emergency_reason: Optional[str] = Field(None, description="Emergency details (e.g. Client presentation in 5 mins)")
    emergency_contact: Optional[str] = Field(None, description="Direct phone/callback number or desk location")
    meeting_time: Optional[str] = Field(None, description="When the meeting or hard deadline starts")


class EmergencyFastTrackRequest(BaseModel):
    """Payload to upgrade an existing ticket to Emergency Fast-Track."""
    emergency_reason: str = Field("Imminent meeting starting shortly", description="Reason for escalation")
    emergency_contact: Optional[str] = Field(None, description="Direct callback number or desk/room")
    meeting_time: Optional[str] = Field("In 5 minutes", description="Meeting start time")


class IncidentSummary(BaseModel):
    """Compact summary of an incident for listing tables."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_number: str
    employee_id: str
    device_id: str
    os_type: str
    status: str
    current_step: str
    is_emergency: bool = False
    emergency_reason: Optional[str] = None
    emergency_contact: Optional[str] = None
    meeting_time: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class DiagnosticResultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tool_name: str
    execution_stage: str
    parameters: Dict[str, Any]
    output_payload: Dict[str, Any]
    outcome_status: str
    executed_at: datetime


class RemediationActionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tool_name: str
    parameters: Dict[str, Any]
    execution_status: str
    output_payload: Dict[str, Any]
    executed_at: datetime


class ApprovalRequestItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action_name: str
    reasoning: str
    risk_level: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class ClassificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    sub_category: str
    priority: str
    severity: str
    extracted_symptoms: List[str]
    confidence_score: float


class EmployeeSummaryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    department: str
    role: str


class IncidentDetail(BaseModel):
    """Full incident dossier including diagnostic history, approval state, and actions."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_number: str
    employee_id: str
    device_id: str
    os_type: str
    raw_description: str
    status: str
    current_step: str
    is_emergency: bool = False
    emergency_reason: Optional[str] = None
    emergency_contact: Optional[str] = None
    meeting_time: Optional[str] = None
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    employee: Optional[EmployeeSummaryItem] = None
    classification: Optional[ClassificationItem] = None
    diagnostic_results: List[DiagnosticResultItem] = []
    remediation_actions: List[RemediationActionItem] = []
    approval_requests: List[ApprovalRequestItem] = []
