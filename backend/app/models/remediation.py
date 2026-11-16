import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RemediationAction(Base):
    """Execution history of remediation tool actions."""
    __tablename__ = "remediation_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)                         # e.g., flush_dns_cache, restart_vpn_service
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    execution_status: Mapped[str] = mapped_column(String(50), nullable=False)                  # SUCCESS, FAILED
    output_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="remediation_actions")

