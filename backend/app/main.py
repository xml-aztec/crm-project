import time
import uuid
import sentry_sdk
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.core.database import init_db, SessionLocal
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.scheduler.jobs import process_due_reminders
from app.utils.init_admin_user import init_admin_user
from app.utils.init_cashflow_types import init_cash_flow_types
from app.utils.init_notification_types import init_notification_types
from app.utils.init_order_statuses import init_order_statuses
from app.utils.init_roles import init_roles
from app.utils.init_positions import init_positions
from app.rbac.seed import migrate_users_to_rbac_roles

from app.api import (
    health, auth, users, categories, subcategories, brands, branches,
    warehouses, products, product_stocks, customer_types, order_statuses,
    orders, order_items, suppliers, supplies, payment_methods,
    roles, positions, cashflow_meta, budgets, cash_gaps,
    analytics, supply_analytics, stock_logs, cashflows,
    monthly_targets, kpi_rules, payrolls, customers, notifications, rbac,
    tasks, search, order_returns, product_images, app_settings,
)

configure_logging()
logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000)
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SENTRY_DSN:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)
        logger.info("sentry_initialized")

    await init_db()

    async with SessionLocal() as session:
        await init_roles(session)
        await init_admin_user(session)
        await init_order_statuses(session)
        await init_cash_flow_types(session)
        await init_positions(session)
        await migrate_users_to_rbac_roles(session)
        await init_notification_types(session)

    # Встроенный планировщик — не отдельный процесс/брокер, а джоба на том же
    # asyncio event loop uvicorn (в проекте один воркер, см. docker-entrypoint.sh),
    # что достаточно для лёгкого коммерческого проекта без Redis/Celery.
    # Идемпотентность обеспечивается на уровне БД в claim_due_reminders, а не
    # настройками планировщика — coalesce/max_instances здесь просто доп. подстраховка.
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        process_due_reminders,
        "interval",
        minutes=settings.TASK_REMINDER_INTERVAL_MINUTES,
        id="task_reminders",
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)

app = FastAPI(
    title="CRM System",
    description="Backend API for CRM",
    version="0.1.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
]
# Прод/тестовый домен фронтенда (например, Railway) задаётся через
# FRONTEND_URL и добавляется сюда автоматически, чтобы не хардкодить хост.
if settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(subcategories.router)
app.include_router(brands.router)
app.include_router(branches.router)
app.include_router(warehouses.router)
app.include_router(products.router)
app.include_router(product_stocks.router)
app.include_router(customer_types.router)
app.include_router(order_statuses.router)
app.include_router(orders.router)
app.include_router(order_items.router)
app.include_router(suppliers.router)
app.include_router(supplies.router)
app.include_router(payment_methods.router)
app.include_router(roles.router)
app.include_router(positions.router)
app.include_router(cashflow_meta.router)
app.include_router(budgets.router)
app.include_router(cash_gaps.router)
app.include_router(analytics.router)
app.include_router(supply_analytics.router)
app.include_router(stock_logs.router)
app.include_router(cashflows.router)
app.include_router(monthly_targets.router)
app.include_router(kpi_rules.router)
app.include_router(payrolls.router)
app.include_router(customers.router)
app.include_router(notifications.router)
app.include_router(rbac.router)
app.include_router(tasks.router)
app.include_router(search.router)
app.include_router(order_returns.router)
app.include_router(product_images.router)
app.include_router(app_settings.router)
