# Установка и запуск

## Требования

- Docker и Docker Compose (для БД + опционально всего стека)
- Node.js 20+ (Vite/`@tailwindcss/oxide` требуют Node ≥ 20)
- Python 3.12+ с [Poetry](https://python-poetry.org/)

## Переменные окружения (`backend/.env`)

Актуальный список — из `backend/app/core/config.py` (класс `Settings`), сверен с `backend/.env.example`, который уже есть в репозитории:

| Переменная | Обязательна | Дефолт | Назначение |
|---|---|---|---|
| `DATABASE_URL` | да | — | `postgresql+asyncpg://user:pass@host:port/db`. Также принимает `postgres://`/`postgresql://` (автоматически конвертируется на драйвер asyncpg — нужно для managed-Postgres вроде Railway, которые выдают URL без `+asyncpg`) |
| `SECRET_KEY` | да | — | Секрет для подписи JWT (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | да | — | Email сид-администратора, создаётся при первом старте |
| `ADMIN_PASSWORD` | да | — | Пароль сид-администратора |
| `ADMIN_FULL_NAME` | нет | `Super Admin` | Имя сид-администратора |
| `BASE_URL` | нет | `http://localhost:8000` | Используется только для вычисления `secure`/`SameSite` JWT-куки (`https://` → `Secure; SameSite=None`) |
| `FRONTEND_URL` | нет | `http://localhost:5173` | Добавляется в список CORS-origins; используется в ссылке для сброса пароля |
| `SENTRY_DSN` | нет | не задан | Мониторинг ошибок, при пустом — Sentry не инициализируется |
| `RESEND_API_KEY` | нет | не задан | Email-уведомления через Resend; при пустом — письма молча не отправляются, ошибок нет |
| `MAIL_FROM` | нет | `onboarding@resend.dev` | Адрес отправителя писем |

Готовый шаблон уже лежит в `backend/.env.example` — скопируйте его в `backend/.env` и заполните.

## Локальный запуск

### Вариант 1 — Docker Compose (БД + backend + frontend по отдельности)

```bash
git clone <репозиторий>
cd crm-project
cp backend/.env.example backend/.env   # и заполните значения
docker compose up --build              # поднимет db + backend + frontend (порт 80)
# либо только БД + backend, если фронтенд разрабатываете отдельно:
docker compose up db backend
```

`docker-compose.yml`: PostgreSQL 15 на хостовом порту **5434** (контейнерный 5432), backend на 8000, frontend (билд + статика) на 80.

### Вариант 2 — сервисы по отдельности (для разработки с hot-reload)

```bash
# backend
cd backend
poetry install
uvicorn app.main:app --reload --port 8000

# frontend (в отдельном терминале)
cd frontend
npm install
npm run dev   # http://localhost:5173, проксирует на VITE_API_URL (по умолчанию http://localhost:8000)
```

При первом запуске backend автоматически создаёт схему БД (`Base.metadata.create_all`, если БД пустая) и засеивает: роли, RBAC-права и системные роли, администратора из `ADMIN_*`, статусы заказов, типы денежных потоков, должности.

## Миграции (Alembic)

Проект использует гибридную схему — не «пустой baseline», как утверждали старые отчёты в корне репозитория (на момент этого аудита это уже неактуально): после начального `baseline` добавлено **9 реальных миграций** (индексы, RBAC-таблицы и сидинг прав, миграция легаси-ролей в RBAC, `stock_logs.order_id`, `password_reset_tokens`, `product_stock.reserved`, `is_active`/`created_at` на каталоге, `payrolls.paid_at` — таймзона, 2026-08-29).

```bash
cd backend

# Применить все миграции на существующей БД
alembic upgrade head

# Создать новую миграцию после изменения моделей
alembic revision --autogenerate -m "описание изменений"

# Откатить последнюю
alembic downgrade -1
```

На **пустой** БД `docker-entrypoint.sh` (используется в продовой Docker-сборке) сам определяет, что миграций ещё не применялось, выполняет `create_all()` и `alembic stamp head` вместо прогона истории миграций «с нуля» — это осознанное решение проблемы пустого baseline, а не текущий незакрытый риск (см. [known-issues.md](./known-issues.md) — единственный оставшийся нюанс: `main.py`-lifespan всё ещё безусловно вызывает `create_all()` при каждом старте, что не заменяет ALTER-миграции для существующих таблиц).

## Тесты

```bash
cd backend
poetry install --with dev
pytest -v
```

Тесты — интеграционные (httpx против реального FastAPI-приложения), требуют работающий PostgreSQL по `DATABASE_URL` и переменные `ADMIN_EMAIL`/`ADMIN_PASSWORD` (например, из `.env`). CI (`.github/workflows/deploy.yml`) поднимает `postgres:15` как сервис на каждый push/PR в `main`; из GitHub Secrets требуется `SECRET_KEY`.

Frontend-тестов нет — `npm run lint` (ESLint) — единственная автоматическая проверка на фронтенде помимо `tsc` при сборке.

## Сборка

```bash
cd frontend
npm run build   # tsc -b && vite build → frontend/dist
```

## Деплой

**Целевой хостинг подтверждён командой: Render.com** (`render.yaml` в корне). В репозитории при этом остаются мёртвые/устаревшие следы Fly.io и Railway — см. [known-issues.md](./known-issues.md#8-мёртвая-конфигурация-flyio-и-railway-целевой-хостинг--rendercom), их стоит вычистить, но они не блокируют деплой на Render.

⚠️ **Перед первым реальным деплоем на Render нужно закрыть критичный баг**: `render.yaml` рассчитывает, что `BASE_URL`/`FRONTEND_URL` определятся автоматически через функцию `_default_urls_from_render` в `core/config.py` — но эта функция была удалена коммитом `295663b` уже после того, как `render.yaml` был написан под неё. Без неё обе переменные останутся на дефолтах `http://localhost:8000`/`http://localhost:5173`, из-за чего:
- JWT-кука уйдёт с `secure=False` вместо `True` (`is_https = BASE_URL.startswith("https://")`) — регрессия ранее закрытой уязвимости;
- ссылка в письме сброса пароля будет вести на `localhost:5173`, а не на реальный домен фронтенда.

**Исправление**: либо вернуть автоопределение из `RENDER_EXTERNAL_URL` (переменная, которую Render передаёт каждому сервису автоматически), либо явно задать `BASE_URL` и `FRONTEND_URL` как обычные env-переменные в `render.yaml`/Render Dashboard до деплоя. Подробности — критичный пункт №4 в [gaps-and-roadmap.md](./gaps-and-roadmap.md).

Что уже готово и не требует доработки:
- Корневой `Dockerfile` — собирает frontend и backend в один образ (nginx отдаёт статику и проксирует `/api/*` на локальный uvicorn в том же контейнере), `docker-entrypoint.sh` — точка входа (миграции → uvicorn в фоне → nginx на переднем плане). Это тот же `Dockerfile`, что использует `render.yaml`.
- Health-check: `GET /health` → `{"status":"ok","db":"ok","version":"0.1.0"}`, уже подключён в `render.yaml` как `healthCheckPath`.
- `render.yaml` уже поднимает managed Postgres (`DATABASE_URL` пробрасывается автоматически) и сам генерирует `SECRET_KEY` (`generateValue: true`); `ADMIN_EMAIL`/`ADMIN_PASSWORD` нужно задать вручную в Render Dashboard (`sync: false`).
- Опционально: `SENTRY_DSN`, `RESEND_API_KEY` — сейчас не заданы, без них мониторинг ошибок и email отключены, но это не блокирует деплой.

Что стоит вычистить как мёртвое (не блокирует деплой, но вводит в заблуждение): `Dockerfile-backend`/`Dockerfile-frontend` (сценарий «два сервиса», актуальный для Fly.io, не для Render) и `nginx/default.conf` (не `.template`) с захардкоженным `proxy_pass` на несуществующий `leadflow-backend.fly.dev`.
