import pytest
from sqlalchemy import select
from app.database import init_db, AsyncSessionLocal
from app.models import Employee, KnowledgeDocument


@pytest.mark.asyncio
async def test_init_db_seeds_data():
    """Verifies that init_db creates tables and seeds default employees and runbooks."""
    await init_db()
    async with AsyncSessionLocal() as session:
        emps = (await session.execute(select(Employee))).scalars().all()
        rbs = (await session.execute(select(KnowledgeDocument))).scalars().all()
        assert len(emps) >= 2
        assert len(rbs) >= 3
        # Check specific seeded runbook
        vpn_sop = next((r for r in rbs if r.doc_code == "SOP-NET-001"), None)
        assert vpn_sop is not None
        assert "AnyConnect" in vpn_sop.title

