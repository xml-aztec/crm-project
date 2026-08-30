import os
from typing import Optional
from pydantic import field_validator, model_validator
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

    # Фоновая обработка напоминаний о задачах (см. app/scheduler/jobs.py).
    # TASK_REMINDER_TOKEN защищает служебный POST /tasks/reminders/process —
    # без него ручной/внешний запуск обработки недоступен (эндпоинт вернёт 403).
    TASK_REMINDER_TOKEN: Optional[str] = None
    TASK_REMINDER_INTERVAL_MINUTES: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("DATABASE_URL")
    @classmethod
    def _use_asyncpg_driver(cls, v: str) -> str:
        # Managed Postgres providers (e.g. Render) hand out a plain
        # postgres:// / postgresql:// URL; SQLAlchemy's async engine needs
        # the asyncpg driver explicitly in the scheme.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    @model_validator(mode="after")
    def _default_urls_from_render(self) -> "Settings":
        # Render injects RENDER_EXTERNAL_URL (the service's public https URL)
        # automatically — the exact subdomain isn't known until first deploy,
        # so fall back to it instead of requiring BASE_URL/FRONTEND_URL to be
        # hardcoded in render.yaml ahead of time.
        #
        # NOTE: this is used by render.yaml even though nothing in this file
        # references RENDER_EXTERNAL_URL directly by name — do not remove as
        # "unused" (it was removed once already in commit 295663b and broke
        # secure-cookie/password-reset-link behavior on Render deploys).
        external_url = os.environ.get("RENDER_EXTERNAL_URL")
        if external_url:
            if "BASE_URL" not in os.environ:
                self.BASE_URL = external_url
            if "FRONTEND_URL" not in os.environ:
                self.FRONTEND_URL = external_url
        return self

settings = Settings()