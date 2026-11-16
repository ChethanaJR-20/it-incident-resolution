"""Application configuration loaded from backend/.env using pydantic-settings."""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # Points to .../backend
ENV_PATH = BASE_DIR / ".env"
DEFAULT_DB_PATH = (BASE_DIR / "incident_db.db").as_posix()


class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_PORT: int = 8000
    DEBUG: bool = True

    # Database connection string
    # Defaults to SQLite async for zero-friction local execution.
    # Set to postgresql+asyncpg://... for PostgreSQL in production.
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # Security
    SECRET_KEY: str = "dev_secret_key_change_me_to_random_64_characters_in_production_environment"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Google Gemini API
    GEMINI_API_KEY: str = "PASTE_MY_GEMINI_API_KEY_HERE"
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Operational Parameters
    AUTO_REMEDIATION_ENABLED: bool = True
    SIMULATION_MODE: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=(str(ENV_PATH), "backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def async_database_url(self) -> str:
        """Ensure database URL is properly formatted for async SQLAlchemy."""
        url = self.DATABASE_URL
        if url.startswith("sqlite+aiosqlite:///."):
            rel = url.replace("sqlite+aiosqlite:///.", "", 1).lstrip("/\\")
            abs_path = (BASE_DIR / rel).as_posix()
            return f"sqlite+aiosqlite:///{abs_path}"
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()


