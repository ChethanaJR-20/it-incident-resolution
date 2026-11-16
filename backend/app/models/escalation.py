import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class EscalationRecord(Base):
    """Tier-2 human engineering handoff packages."""
    __tablename__ = "escalation_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    diagnostic_summary: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_queue: Mapped[str] = mapped_column(String(100), nullable=False, default="Tier-2 Network Engineering")
    escalated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="escalation_records")

