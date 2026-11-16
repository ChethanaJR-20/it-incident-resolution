import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, Text, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class KnowledgeDocument(Base):
    """Approved Standard Operating Procedure (SOP) runbooks."""
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doc_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)  # e.g., SOP-NET-001
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)               # e.g., VPN, NETWORK, DNS
    content: Mapped[str] = mapped_column(Text, nullable=False)
    allowable_tools: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

