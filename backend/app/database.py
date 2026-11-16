"""Database engine, async session factory, and declarative Base."""

import json
import os
import uuid
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Engine configuration
connect_args = {}
db_url = getattr(settings, "async_database_url", settings.DATABASE_URL)
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30.0

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Creates all database tables and seeds initial development fixtures."""
    from app.models import (
        Employee,
        Incident,
        IncidentClassification,
        KnowledgeDocument,
        DiagnosticResult,
        RemediationAction,
        ApprovalRequest,
        EscalationRecord,
        Notification,
        AuditLog,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def migrate_sqlite_columns(sync_conn):
            if sync_conn.dialect.name != "sqlite":
                return
            from sqlalchemy import text
            try:
                res = sync_conn.execute(text("PRAGMA table_info(incidents)"))
                cols = [r[1] for r in res.fetchall()]
                for c_name, c_type in [
                    ("is_emergency", "BOOLEAN DEFAULT 0"),
                    ("emergency_reason", "VARCHAR(255)"),
                    ("emergency_contact", "VARCHAR(100)"),
                    ("meeting_time", "VARCHAR(100)"),
                ]:
                    if c_name not in cols:
                        sync_conn.execute(text(f"ALTER TABLE incidents ADD COLUMN {c_name} {c_type}"))

                emp_res = sync_conn.execute(text("PRAGMA table_info(employees)"))
                emp_cols = [r[1] for r in emp_res.fetchall()]
                if "hashed_password" not in emp_cols:
                    sync_conn.execute(text("ALTER TABLE employees ADD COLUMN hashed_password VARCHAR(255)"))
            except Exception:
                pass

        await conn.run_sync(migrate_sqlite_columns)

    # Seed default employees and runbooks if not present
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.core.security import hash_password

        # Seed employees
        emp_result = await session.execute(select(Employee).limit(1))
        default_pwd_hash = hash_password("password123")
        if not emp_result.scalar_one_or_none():
            demo_employee = Employee(
                id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
                email="john.doe@enterprise.corp",
                full_name="John Doe",
                department="Engineering",
                role="EMPLOYEE",
                hashed_password=default_pwd_hash,
            )
            demo_admin = Employee(
                id="e7b1a2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
                email="admin@enterprise.corp",
                full_name="Sarah Connor (IT Lead)",
                department="IT Infrastructure",
                role="ADMIN",
                hashed_password=default_pwd_hash,
            )
            session.add_all([demo_employee, demo_admin])
        else:
            # Ensure existing seed users have default passwords if null
            all_emps = (await session.execute(select(Employee))).scalars().all()
            for emp in all_emps:
                if not emp.hashed_password:
                    emp.hashed_password = default_pwd_hash

        # Seed runbooks
        runbook_result = await session.execute(select(KnowledgeDocument).limit(1))
        if not runbook_result.scalar_one_or_none():
            fixtures_path = os.path.join(os.path.dirname(__file__), "fixtures", "runbooks.json")
            if os.path.exists(fixtures_path):
                with open(fixtures_path, "r", encoding="utf-8") as f:
                    runbooks_data = json.load(f)
                    for item in runbooks_data:
                        kb_doc = KnowledgeDocument(
                            doc_code=item["doc_code"],
                            title=item["title"],
                            category=item["category"],
                            content=item["content"],
                            allowable_tools=item.get("allowable_tools", {}),
                        )
                        session.add(kb_doc)

        await session.commit()
