import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ApprovalRequest(Base):
    """Human-in-the-loop authorization gates for privileged operations."""
    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    
    action_name: Mapped[str] = mapped_column(String(100), nullable=False)                        # e.g., restart_vpn_service
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")      # LOW, MEDIUM, HIGH
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    incident = relationship("Incident", back_populates="approval_requests")
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])

