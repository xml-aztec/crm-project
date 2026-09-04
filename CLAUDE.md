# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Full-stack CRM/ERP for retail and wholesale businesses in Central Asia. Backend: FastAPI + async SQLAlchemy + PostgreSQL. Frontend: React 19 + Redux Toolkit (RTK Query) + Tailwind CSS. Deployment target is Render (`render.yaml` at the repo root); see the Deployment section.

---

## Development Commands

### Backend

```bash
cd backend

# Install dependencies (uses Poetry)
poetry install

# Run dev server
uvicorn app.main:app --reload --port 8000

# Run with a local .env file present (required — see env vars below)
DATABASE_URL=postgresql+asyncpg://... uvicorn app.main:app --reload

# Generate a new Alembic migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies API to VITE_API_URL or http://localhost:8000)
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

### Docker (full stack locally)

```bash
# Start everything (PostgreSQL + backend + frontend via nginx)
docker compose up --build

# Backend only for development
docker compose up db backend
```

### Environment Variables

Backend requires a `.env` file in `backend/`:

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5434/crm_db
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_password
ADMIN_FULL_NAME=Super Admin
SECRET_KEY=<generate with: openssl rand -hex 32>
BASE_URL=http://localhost:8000
```

Frontend: `VITE_API_URL` must point to the backend (default fallback: `http://localhost:8000`).

---

## Architecture

### Backend: `backend/app/`

Layered architecture — every domain follows the same pattern:

```
api/          → FastAPI routers (one file per domain, thin — delegates to repository)
repositories/ → All DB queries via async SQLAlchemy (business logic lives here)
models/       → SQLAlchemy ORM models
schemas/      → Pydantic v2 schemas (separate Create / Update / Out / Read per domain)
core/         → config.py (Settings), database.py (engine + session), 
                dependencies.py (get_db, get_current_user, is_admin),
                security.py (JWT, bcrypt)
utils/        → pdf.py (pdfkit + jinja2), barcode_utils.py (QR), stock.py,
                init_*.py (seed data run at startup)
templates/    → Jinja2 HTML for PDF generation (supply invoices)
```

**Startup sequence** (`main.py` lifespan): seed roles → seed admin user → seed order statuses → seed cashflow types → seed positions → migrate users to RBAC roles → seed notification types, then start the reminder scheduler.

**Alembic is the only source of truth for the schema.** The app no longer calls `Base.metadata.create_all` at startup — `docker-entrypoint.sh` runs `alembic upgrade head` before uvicorn, detecting three database states (empty, legacy create_all-era, already versioned) and handling each explicitly. The test suite applies migrations too (`tests/conftest.py`), so every run also proves the chain applies to an empty database.

**Authentication flow**: `POST /auth/login` sets an httpOnly JWT cookie (`access_token`). All protected routes use `Depends(get_current_user)` from `core/dependencies.py`, which reads the cookie and validates the JWT. Admin-only routes additionally use `Depends(is_admin)`.

**Two auth roles in practice**: `admin` (full access) and everything else (scoped access — managers see only their own orders, etc.). Role name checked as string `"admin"`.

### Frontend: `frontend/src/`

```
store/
  slices/authSlice.ts    → Auth state (user, isAuthenticated, initialized)
  api/baseApi.ts         → THE single createApi instance; everything else injects into it
  api/                   → 31 endpoint modules, each calling baseApi.injectEndpoints
  store.ts               → Redux store with redux-persist (auth slice persisted)
  middleware/authErrorMiddleware.ts → Auto-logout on 401 from any RTK Query call

pages/                   → Route-level components grouped by domain
components/              → Reusable components grouped by domain
hooks/
  useRoleAccess.ts       → Derives isAdmin, isManager, canEdit, canDelete from Redux state
  reduxHooks.ts          → Typed useAppDispatch / useAppSelector
layout/                  → AppLayout, AppSidebar, AppHeader, Backdrop
```

**API communication**: there is exactly ONE `createApi` instance (`store/api/baseApi.ts`) using `baseQueryWithReauth`; the 31 domain files add their endpoints via `injectEndpoints`. This matters: RTK Query cache tags only work inside a single instance, so splitting them again would silently break cross-domain invalidation. On a 401 the base query dispatches `logoutUser` and redirects to `/signin`. `credentials: 'include'` is global.

**Route protection**: `<RequireAuth>` wrapper in `App.tsx` guards all non-auth routes. On mount it dispatches `fetchCurrentUser` to validate the existing cookie session.

**Adding a new API domain** (common pattern):
1. Create `store/api/fooApi.ts` with `baseApi.injectEndpoints({ endpoints: (builder) => ({ ... }) })` — never a new `createApi`
2. Add any new tag names to `tagTypes` in `store/api/baseApi.ts`
3. Add the module to `store/api/registerEndpoints.ts`
4. Use generated hooks in components — `store.ts` needs no change

### Key Business Logic Locations

| Feature | Backend | Frontend |
|---|---|---|
| Order confirm + stock deduction | `repositories/order.py` + `utils/stock.py` | `pages/orders/OrderDetailsPage.tsx` |
| Payroll generation + KPI calc | `repositories/payroll.py` | `pages/payroll/PayrollManagement.tsx` |
| ABC / XYZ analysis | `repositories/analytics.py` | `components/ecommerce/` |
| Supply PDF with QR | `utils/pdf.py` + `templates/supply_invoice.html` | `store/api/suppliesApi.ts` |
| Stock restore on order cancel | `utils/stock.py::restore_stock_for_order` | — |
| Personal tasks/reminders + calendar CRUD | `api/tasks.py` + `repositories/task.py` | `pages/Calendar.tsx` + `components/tasks/` |
| Reminder delivery (email + in-app) | `scheduler/jobs.py` (embedded `AsyncIOScheduler`, started in `main.py` lifespan) + `repositories/notification_preference.py` | `components/header/NotificationDropdown.tsx` + `pages/config/Notifications.tsx` |

### Database

PostgreSQL 15. Async driver: `asyncpg`. ORM: SQLAlchemy 2.0 async. Session factory: `SessionLocal` in `core/database.py`. Always use `async with SessionLocal() as session` or inject via `Depends(get_db)`.

All `ondelete` on foreign keys is `"SET NULL"` (not `CASCADE`) — deletions leave orphaned records with null FKs rather than cascading.

---

## Critical Known Issues

The following issues from earlier audits have been **fixed**:
- ~~`SECRET_KEY` hardcoded~~ — now read from `settings.SECRET_KEY` (`.env`-backed via `pydantic_settings`).
- ~~`/users/{id}/approve` missing auth guard~~ — now guarded by `Depends(is_admin)`.
- ~~`secure=False` on JWT cookie~~ — now `secure=is_https`, computed from `settings.BASE_URL.startswith("https://")`.
- ~~`echo=True` in the SQLAlchemy engine~~ — now `echo=False`.
- ~~`get_db()` duplicated~~ — both `api/auth.py` and `api/users.py` import it from `core/dependencies`.
- ~~Empty `baseline` Alembic migration~~ — `alembic/versions/85a67bec609b_baseline.py` now creates the full current schema from nothing (regenerated with `alembic revision --autogenerate` against an empty DB and verified driftless against the current models). It replaces the old empty baseline plus the 9 incremental migrations that had been stacked on top of it assuming those tables already existed — that chain could never run end-to-end on a genuinely empty database. `docker-entrypoint.sh` still special-cases pre-existing databases that were provisioned via `create_all` before this fix (no `alembic_version` row) by stamping them to head instead of replaying history — see the comment there.
- ~~`PasswordResetToken` model missing from `app/models/__init__.py`~~ — it exists as its own file but wasn't imported, so Alembic's metadata (`from app.models import *` in `env.py`) didn't know about the `password_reset_tokens` table; a future autogenerate would have generated a migration to drop it. Now imported alongside the other models.
- ~~CI failing on every push (`poetry install --with dev` → `backend does not contain any element`)~~ — `pyproject.toml`'s `packages = [{ include = "backend" }]` resolved relative to `backend/pyproject.toml` itself, i.e. to the nonexistent `backend/backend/`. Fixed to `{ include = "app" }` (the actual importable package) and reproduced/verified fixed in a clean virtualenv.
- ~~84 known vulnerabilities across 20 backend packages / 3 high-severity frontend~~ (`docs/known-issues.md` #10) — down to 3 backend advisories with no available fix (`pdfkit`, one `ecdsa` wontfix, `pip` itself) and 0 frontend. See `docs/known-issues.md` and `CHANGELOG.md` (2026-08-30 entry) for the full list of version bumps (`fastapi` 0.115→0.141, `cryptography` →50.0.1, `pillow` →12.3.0, `react-router` →7.18.3, etc.) and verification steps.

Fixed in the 2026-09-03/04 audit follow-up (see `docs/audit-2026-09-03.md` for the full report):

- ~~Cancelled orders stayed `confirmed = True` forever~~ — every revenue query filtered on `confirmed` alone, so a confirmed-then-cancelled order permanently inflated revenue, manager KPI and payroll bonuses. The condition now lives in one place: `app/utils/orders.py::order_counts_as_revenue()`.
- ~~Quantity was counted twice in 7 analytics queries~~ — `order_items.final_price` is the LINE TOTAL (quantity already included), but KPI/leaderboard queries multiplied by quantity again. See the module docstring in `repositories/analytics.py`.
- ~~`GET /orders/{id}` returned any order to any authenticated user~~ — the ownership check was inverted (it denied the owner and admitted strangers).
- ~~The test suite never created its schema~~ — `conftest.py` now wraps the app in `LifespanManager`, runs Alembic against a dedicated `<name>_test` database, and recreates it per run.
- ~~KPI targets were never found~~ — `get_manager_kpi` passed a `date` to `date.fromisoformat()` (which takes `str`) and a bare `except Exception` swallowed the `TypeError`, so bonuses and penalties were never applied to anyone, regardless of configured targets and rules.
- ~~Stock operations were not atomic and had no row locks~~ — `utils/stock.py` no longer commits internally (callers own the transaction) and takes `SELECT ... FOR UPDATE` before deducting; `CHECK (quantity >= 0)` and siblings now exist in the database.
- ~~Order item prices came from the client~~ — `unit_price` and `final_price` are computed server-side from the catalogue (`utils/orders.py::price_order_item`); the only sanctioned deviation is `discount_percent`, bounded 0–100 and gated by the `orders.discount` permission.
- ~~`X-Forwarded-For` could be spoofed to bypass login rate limits~~ — `--forwarded-allow-ips` is now `127.0.0.1`, not `*`.
- ~~31 separate `createApi` instances~~ — cache tags never crossed instances, so most cross-domain invalidation was a no-op and 22 of 31 slices also bypassed the 401 auto-logout. Now a single `baseApi`.

Known and deliberately not addressed yet:

1. **Seven components still exceed 600 lines** (largest: `pages/CreateOrderPage.tsx` 766, `pages/warehouse/WarehouseInventory.tsx` 753, `components/orders/OrderForm.tsx` 686). Their *business logic* has been pulled out into tested pure modules under `frontend/src/utils/` — `orderPricing`, `orderItems`, `orderValidation`, `stockSorting`, `payrollCalc` — so what remains in the components is mostly JSX and local UI state. Splitting the markup itself is still open; `components/orders/OrdersTable.tsx`, `pages/orders/OrderDetailsPage.tsx` and `pages/finance/CashflowMetaManagement.tsx` have not been touched at all.
2. **Six ESLint warnings remain** (`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`). CI pins the ceiling at exactly 6 so new ones cannot slip in unnoticed.

---

## Deployment

Target host is Render, described by `render.yaml` at the repo root (a Docker web service plus a managed Postgres). It previously ran on Fly.io; that setup was removed.

- **Combined image**: the root `Dockerfile` builds frontend and backend into one nginx+uvicorn image. `docker-entrypoint.sh` applies migrations, starts uvicorn in the background and nginx in the foreground. The image runs as the unprivileged `appuser`, so the default port is 8080, not 80 — Render and Railway inject their own `$PORT` anyway.
- **CORS**: `origins` in `main.py` lists localhost ports plus `settings.FRONTEND_URL`. On Render, `BASE_URL`/`FRONTEND_URL` are left unset on purpose and derived from `RENDER_EXTERNAL_URL` (see `core/config.py`).
- **Security headers** are set by nginx (`nginx/default.conf.template`): CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS.
- **CI**: `.github/workflows/deploy.yml` has two jobs and no deploy step. `test` applies migrations to an empty database and runs pytest; `frontend` runs ESLint, Vitest and the production build.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
