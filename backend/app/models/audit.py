import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AuditLog(Base):
    """Tamper-evident append-only log of every agent and administrative action."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incidents.id"), nullable=True, index=True)
    
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)                         # USER, AGENT, ADMIN, SYSTEM
    action_performed: Mapped[str] = mapped_column(String(100), nullable=False)                  # e.g., INCIDENT_CREATED, TOOL_EXECUTED
    event_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    incident = relationship("Incident", back_populates="audit_logs")

