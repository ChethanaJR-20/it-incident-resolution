from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.runbook_service import RunbookService

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


@router.get("/")
async def list_runbooks(db: AsyncSession = Depends(get_db)):
    """Lists all approved SOP runbooks."""
    runbooks = await RunbookService.list_runbooks(db)
    return [
        {
            "id": r.id,
            "doc_code": r.doc_code,
            "title": r.title,
            "category": r.category,
            "allowable_tools": r.allowable_tools,
            "content": r.content,
        }
        for r in runbooks
    ]


@router.get("/{category}")
async def get_runbook_by_category(category: str, db: AsyncSession = Depends(get_db)):
    """Retrieves the official runbook for a given category."""
    runbook = await RunbookService.get_runbook_by_category(db, category)
    if not runbook:
        raise HTTPException(status_code=404, detail=f"No runbook found for category {category}")
    return {
        "id": runbook.id,
        "doc_code": runbook.doc_code,
        "title": runbook.title,
        "category": runbook.category,
        "allowable_tools": runbook.allowable_tools,
        "content": runbook.content,
    }


@router.post("/generate/{ticket_number}")
async def generate_runbook_from_incident(
    ticket_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Day 5: Generates a new SOP runbook from a resolved incident's post-incident review."""
    try:
        new_doc = await RunbookService.generate_runbook_from_incident(db, ticket_number)
        return {
            "status": "RUNBOOK_CREATED",
            "doc_code": new_doc.doc_code,
            "title": new_doc.title,
            "category": new_doc.category,
            "allowable_tools": new_doc.allowable_tools,
            "content": new_doc.content,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate runbook: {str(e)}")


