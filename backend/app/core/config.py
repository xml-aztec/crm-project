from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    ADMIN_FULL_NAME: str = "Super Admin"
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    SENTRY_DSN: Optional[str] = None

    # Email via Resend (optional — leave RESEND_API_KEY blank to disable email notifications)
    RESEND_API_KEY: Optional[str] = None
    MAIL_FROM: Optional[str] = "onboarding@resend.dev"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("DATABASE_URL")
    @classmethod
    def _use_asyncpg_driver(cls, v: str) -> str:
        # Managed Postgres providers (e.g. Railway) hand out a plain
        # postgres:// / postgresql:// URL; SQLAlchemy's async engine needs
        # the asyncpg driver explicitly in the scheme.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

settings = Settings()