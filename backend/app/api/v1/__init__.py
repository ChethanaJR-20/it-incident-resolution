from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.runbooks import router as runbooks_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.copilot import router as copilot_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(auth_router, prefix="/auth")
api_v1_router.include_router(incidents_router)
api_v1_router.include_router(runbooks_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(simulation_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(copilot_router)
