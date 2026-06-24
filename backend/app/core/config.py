from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    ADMIN_FULL_NAME: str = "Super Admin"
    BASE_URL: str = "https://leadflow-beta.fly.dev"
    FRONTEND_URL: str = "https://leadflow-beta.fly.dev"
    SENTRY_DSN: Optional[str] = None

    # Email via Resend (optional — leave RESEND_API_KEY blank to disable email notifications)
    RESEND_API_KEY: Optional[str] = None
    MAIL_FROM: Optional[str] = "onboarding@resend.dev"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()