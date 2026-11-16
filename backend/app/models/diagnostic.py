import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DiagnosticResult(Base):
    """Telemetry outputs from diagnostic tool executions."""
    __tablename__ = "diagnostic_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)                         # e.g., resolve_dns, ping_gateway
    execution_stage: Mapped[str] = mapped_column(String(50), nullable=False)                    # PRE_REMEDIATION, POST_REMEDIATION
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    output_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    outcome_status: Mapped[str] = mapped_column(String(50), nullable=False)                    # HEALTHY, FAULT_DETECTED, ERROR
    
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="diagnostic_results")

