import uuid
from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy import String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class IncidentClassification(Base):
    """Output from the AI triage and categorization step."""
    __tablename__ = "incident_classifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id"), unique=True, nullable=False, index=True)
    
    category: Mapped[str] = mapped_column(String(50), nullable=False)        # VPN, NETWORK, DNS, AUTH, SOFTWARE, etc.
    sub_category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(10), nullable=False)         # P1, P2, P3, P4
    severity: Mapped[str] = mapped_column(String(20), nullable=False)         # LOW, MEDIUM, HIGH, CRITICAL
    
    extracted_symptoms: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    classified_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="classification")

