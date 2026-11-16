from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, ConfigDict


class CategoryMetric(BaseModel):
    category: str
    count: int


class PriorityMetric(BaseModel):
    priority: str
    count: int


class StatusMetric(BaseModel):
    status: str
    count: int


class DashboardMetrics(BaseModel):
    """Aggregated KPIs and Chart Data for IT Administrator Command Center."""
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    escalated_incidents: int
    pending_approvals: int
    resolution_rate_percent: float
    avg_resolution_time_seconds: float
    category_distribution: List[CategoryMetric]
    priority_distribution: List[PriorityMetric]
    status_distribution: List[StatusMetric]


class AuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: Optional[str]
    actor_type: str
    action_performed: str
    event_metadata: Dict[str, Any]
    timestamp: datetime


class EscalationDossier(BaseModel):
    """Complete Tier-2 technical handoff package."""
    ticket_number: str
    incident_id: str
    device_id: str
    category: str
    priority: str
    escalation_reason: str
    assigned_queue: str
    escalated_at: datetime
    formatted_dossier_markdown: str
    diagnostic_evidence: List[Dict[str, Any]]
    attempted_remediations: List[Dict[str, Any]]
