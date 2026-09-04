# LeadFlow CRM

Full-stack CRM/ERP for retail and wholesale businesses. FastAPI + PostgreSQL backend, React 19 + Redux Toolkit frontend. Deployment target is Render (`render.yaml`).

> **Документация проекта — в [`docs/`](docs/README.md).** Этот файл даёт только
> быстрый старт. Более ранние обзорные документы перенесены в
> [`docs/archive/`](docs/archive/README.md).

## Quick Start (local)

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+ with [Poetry](https://python-poetry.org/)

### 1. Clone and configure

```bash
git clone https://github.com/xml-aztec/crm-project.git
cd crm-project
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5434/crm_db
SECRET_KEY=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_password
ADMIN_FULL_NAME=Administrator
BASE_URL=http://localhost:8000
```

### 2. Run with Docker Compose

```bash
# Start PostgreSQL + backend + frontend
docker compose up --build

# Backend only (for development with hot-reload)
docker compose up db backend
```

### 3. Run frontend separately (hot-reload)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Backend dev server:

```bash
cd backend
poetry install
uvicorn app.main:app --reload --port 8000
```

## Architecture

| Layer | Stack |
|---|---|
| Backend | FastAPI, async SQLAlchemy 2.0, PostgreSQL 15, asyncpg |
| Frontend | React 19, Redux Toolkit (RTK Query), Tailwind CSS |
| Auth | httpOnly JWT cookie, bcrypt passwords |
| Deploy | not currently deployed (previously Fly.io, host TBD) |

### Backend structure (`backend/app/`)

```
api/           — FastAPI routers, one file per domain
repositories/  — All DB queries (business logic lives here)
models/        — SQLAlchemy ORM models
schemas/       — Pydantic v2 request/response schemas
core/          — config, database, dependencies, security
utils/         — PDF generation, barcode, stock helpers, seed scripts
```

### Frontend structure (`frontend/src/`)

```
store/api/     — 22 RTK Query slices
pages/         — Route-level components
components/    — Reusable UI components
hooks/         — useRoleAccess, reduxHooks
layout/        — AppLayout, AppSidebar, AppHeader
```

## Running tests

```bash
cd backend
poetry install --with dev
pytest -v
```

Tests require a running PostgreSQL instance at `DATABASE_URL`. Minimum required env vars:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/crm_db
SECRET_KEY=any_32_char_string
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=testpassword123
ADMIN_FULL_NAME=Test Admin
```

## Database migrations

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe change"
```

## Deployment

Not currently deployed anywhere — previously ran on Fly.io as two separate apps (`leadflow-backend`, `leadflow-frontend`); that setup was removed, the project will move to a different host later. The root `Dockerfile` (combined backend+frontend via nginx+uvicorn, see `docker-entrypoint.sh`) and per-service `Dockerfile-backend`/`Dockerfile-frontend` are still here and reusable for whichever host is chosen next.

CI (`.github/workflows/deploy.yml`) currently only runs the test suite on push/PR to `main` — no deploy step.

## Health check

```
GET /health → {"status": "ok", "db": "ok", "version": "0.1.0"}
```
