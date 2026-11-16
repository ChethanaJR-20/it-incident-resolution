import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Incident(Base):
    """Core tracking entity for employee IT incidents."""
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    raw_description: Mapped[str] = mapped_column(Text, nullable=False)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    os_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Windows 11")
    
    # State machine: SUBMITTED, CLASSIFIED, INVESTIGATING, AWAITING_APPROVAL, REMEDIATING, VERIFYING, RESOLVED, ESCALATED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUBMITTED", index=True)
    current_step: Mapped[str] = mapped_column(String(255), nullable=False, default="Incident Logged")
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Emergency Fast-Track Fields (e.g. Imminent Meeting in 5 minutes)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    emergency_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meeting_time: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="incidents")
    classification = relationship("IncidentClassification", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    diagnostic_results = relationship("DiagnosticResult", back_populates="incident", cascade="all, delete-orphan")
    remediation_actions = relationship("RemediationAction", back_populates="incident", cascade="all, delete-orphan")
    approval_requests = relationship("ApprovalRequest", back_populates="incident", cascade="all, delete-orphan")
    escalation_records = relationship("EscalationRecord", back_populates="incident", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="incident", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="incident", cascade="all, delete-orphan")

