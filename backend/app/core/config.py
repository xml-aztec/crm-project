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

    # Пул соединений SQLAlchemy. Значения по умолчанию подобраны так, чтобы
    # один процесс приложения помещался в лимиты минимальных тарифов
    # managed-Postgres (у Render free это ~97 соединений на инстанс, часть из
    # которых резервирует сам провайдер). Раньше здесь было жёстко
    # прошито 20 + 10 overflow = до 30 соединений на процесс, что при паре
    # инстансов или воркеров упиралось в отказ БД в подключении.
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30

    # asyncpg кэширует подготовленные запросы; это ломается ТОЛЬКО за
    # пулером в transaction-режиме (PgBouncer, Supabase pooler), который
    # отдаёт разные backend-соединения в рамках одной сессии. Render отдаёт
    # прямое соединение с Postgres, поэтому по умолчанию кэш включён —
    # выключать его глобально означало заново разбирать и планировать каждый
    # запрос. Переезд за пулер = выставить этот флаг в true.
    DB_DISABLE_STATEMENT_CACHE: bool = False

    # Email via Resend (optional — leave RESEND_API_KEY blank to disable email notifications)
    RESEND_API_KEY: Optional[str] = None
    MAIL_FROM: Optional[str] = "onboarding@resend.dev"

    # Фоновая обработка напоминаний о задачах (см. app/scheduler/jobs.py).
    # TASK_REMINDER_TOKEN защищает служебный POST /tasks/reminders/process —
    # без него ручной/внешний запуск обработки недоступен (эндпоинт вернёт 403).
    TASK_REMINDER_TOKEN: Optional[str] = None
    TASK_REMINDER_INTERVAL_MINUTES: int = 2

    # Хранилище изображений товаров (Cloudflare R2, S3-совместимое, см.
    # app/utils/storage.py). Опционально — если не задано, эндпоинты
    # изображений вернут понятную 500 при обращении, а не сломают запуск
    # приложения (тот же принцип, что и у RESEND_API_KEY выше).
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: Optional[str] = None
    # Публичный базовый URL бакета (r2.dev или кастомный домен) — используется
    # для построения/разбора ссылок на объекты, без подписанных ссылок на показ.
    R2_PUBLIC_URL: Optional[str] = None

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