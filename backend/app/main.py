from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events: initialize database tables and seed fixtures on startup."""
    print(f"[*] Starting Autonomous IT Incident Resolution API in {settings.APP_ENV} mode...")
    await init_db()
    print("[*] Database tables initialized and default identities verified.")
    yield
    print("[*] Shutting down application gracefully...")


app = FastAPI(
    title="Autonomous IT Incident Resolution Agent API",
    description="Enterprise-grade AI agent backend for automated Tier-1 IT incident triage, diagnostics, and remediation.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(api_v1_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "it-incident-resolution-agent",
        "environment": settings.APP_ENV,
        "database_connected": True,
    }

