# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Full-stack CRM/ERP for retail and wholesale businesses in Central Asia. Backend: FastAPI + async SQLAlchemy + PostgreSQL. Frontend: React 19 + Redux Toolkit (RTK Query) + Tailwind CSS. Not currently deployed (see Deployment section).

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

**Startup sequence** (`main.py` lifespan): `init_db()` → seed roles → seed admin user → seed order statuses → seed cashflow types → seed positions → migrate users to RBAC roles. On every boot the DB schema is created/verified via `Base.metadata.create_all` (idempotent — only creates missing tables); in deployed environments `docker-entrypoint.sh` runs `alembic upgrade head` (or a create_all+stamp fallback for pre-migration databases) before the app starts, so Alembic is the actual source of truth for schema changes there.

**Authentication flow**: `POST /auth/login` sets an httpOnly JWT cookie (`access_token`). All protected routes use `Depends(get_current_user)` from `core/dependencies.py`, which reads the cookie and validates the JWT. Admin-only routes additionally use `Depends(is_admin)`.

**Two auth roles in practice**: `admin` (full access) and everything else (scoped access — managers see only their own orders, etc.). Role name checked as string `"admin"`.

### Frontend: `frontend/src/`

```
store/
  slices/authSlice.ts    → Auth state (user, isAuthenticated, initialized)
  api/                   → 22 RTK Query API slices, all using baseQuery.ts
  store.ts               → Redux store with redux-persist (auth slice persisted)
  middleware/authErrorMiddleware.ts → Auto-logout on 401 from any RTK Query call

pages/                   → Route-level components grouped by domain
components/              → Reusable components grouped by domain
hooks/
  useRoleAccess.ts       → Derives isAdmin, isManager, canEdit, canDelete from Redux state
  reduxHooks.ts          → Typed useAppDispatch / useAppSelector
layout/                  → AppLayout, AppSidebar, AppHeader, Backdrop
```

**API communication**: All RTK Query slices use `baseQueryWithReauth` from `store/api/baseQuery.ts`. On a 401 response it dispatches `logoutUser` thunk and redirects to `/signin`. `credentials: 'include'` is set globally so cookies are sent automatically.

**Route protection**: `<RequireAuth>` wrapper in `App.tsx` guards all non-auth routes. On mount it dispatches `fetchCurrentUser` to validate the existing cookie session.

**Adding a new API domain** (common pattern):
1. Create `store/api/fooApi.ts` with `createApi({ reducerPath: 'fooApi', baseQuery: baseQueryWithReauth, ... })`
2. Register reducer and middleware in `store/store.ts`
3. Use generated hooks in components

### Key Business Logic Locations

| Feature | Backend | Frontend |
|---|---|---|
| Order confirm + stock deduction | `repositories/order.py` + `utils/stock.py` | `pages/orders/OrderDetailsPage.tsx` |
| Payroll generation + KPI calc | `repositories/payroll.py` | `pages/payroll/PayrollManagement.tsx` |
| ABC / XYZ analysis | `repositories/analytics.py` | `components/ecommerce/` |
| Supply PDF with QR | `utils/pdf.py` + `templates/supply_invoice.html` | `store/api/suppliesApi.ts` |
| Stock restore on order cancel | `utils/stock.py::restore_stock_for_order` | — |

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

Remaining / newly found:

1. **The test suite never actually creates its database schema.** `tests/conftest.py` drives the app through `httpx.AsyncClient(transport=ASGITransport(app=app))`, which only forwards `http`-type ASGI scopes — it never sends the `lifespan` protocol, so `main.py`'s `init_db()` (and all the startup seeding) never runs. Verified locally: every test that touches the DB fails with `relation "users" does not exist` against a genuinely fresh Postgres. This was previously masked by the CI `poetry install` failure (CI never got far enough to run pytest) — now that CI can actually run, this will surface there too. Fix is probably wrapping the app in `asgi-lifespan`'s `LifespanManager` (or an equivalent fixture that calls `init_db()`) in `conftest.py`.

---

## Deployment

Not currently deployed anywhere — previously ran on Fly.io (separate `leadflow-backend`/`leadflow-frontend` apps), that setup has been removed; the project will move to a different host later.

- **Combined**: `Dockerfile` at root still builds both into a single nginx+uvicorn image; `docker-entrypoint.sh` starts uvicorn in background then nginx in foreground — reusable regardless of host
- **CORS**: `origins` in `main.py` currently only lists localhost ports — add the new frontend's origin there once a host is chosen
- **CI**: `.github/workflows/deploy.yml` only runs the test suite now (no deploy step)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
