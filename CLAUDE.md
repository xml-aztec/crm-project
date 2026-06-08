# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Full-stack CRM/ERP for retail and wholesale businesses in Central Asia. Backend: FastAPI + async SQLAlchemy + PostgreSQL. Frontend: React 19 + Redux Toolkit (RTK Query) + Tailwind CSS. Deployed on Fly.io.

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

**Startup sequence** (`main.py` lifespan): `init_db()` → seed roles → seed admin user → seed order statuses → seed cashflow types. The DB schema is currently created via `Base.metadata.create_all` — Alembic migrations exist but the single `baseline` migration is empty.

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

1. **`SECRET_KEY` is hardcoded** in `backend/app/core/security.py:9` — must be moved to `.env` before any production use.
2. **`/users/{id}/approve` has no auth guard** (`backend/app/api/users.py:192`) — missing `Depends(is_admin)`.
3. **`secure=False` on JWT cookie** (`backend/app/api/auth.py:67`) — must be `True` on HTTPS.
4. **`echo=True` in the SQLAlchemy engine** (`backend/app/core/database.py:5`) — logs every SQL query; disable in production.
5. **`restore_stock_for_order`** (`utils/stock.py:57`) accesses `item.order.warehouse_id` — lazy relationship that will raise `MissingGreenlet` in async context; needs explicit `selectinload`.
6. **`get_db()` is duplicated** in `api/auth.py` and `api/users.py` — should use `from app.core.dependencies import get_db`.

---

## Deployment

- **Backend**: Fly.io app `leadflow-backend`, config in `fly.backend.toml`, built from `Dockerfile-backend`
- **Frontend**: Fly.io app `leadflow-frontend`, config in `fly.frontend.toml`, built from `Dockerfile-frontend`
- **Combined**: `Dockerfile` at root builds both into a single nginx+uvicorn image; `docker-entrypoint.sh` starts uvicorn in background then nginx in foreground
- **CORS**: Only `https://leadflow-beta.fly.dev` is whitelisted in `main.py` — localhost origins are commented out
