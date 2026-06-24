# LeadFlow CRM/ERP — технический отчёт по проекту

**Дата отчёта:** 2026-06-13
**Версия:** 0.1.0
**Репозиторий:** `crm-project` (ветка `main`)

---

## 1. Назначение системы

Full-stack CRM/ERP для розничной и оптовой торговли (целевой рынок — Центральная Азия). Покрывает полный операционный цикл: клиенты → каталог → заказы → складской учёт → поставки → финансы (P&L, бюджеты, кассовые разрывы) → расчёт зарплаты с KPI.

---

## 2. Технологический стек

### Backend
| Компонент | Технология / версия |
|---|---|
| Язык | Python ^3.12 |
| Framework | FastAPI ^0.115.12 (extras=all) |
| ORM | SQLAlchemy ^2.0.41, async |
| Драйвер БД | asyncpg ^0.30.0 |
| БД | PostgreSQL 15 |
| Валидация | Pydantic ^2.11.5, pydantic-settings ^2.9.1 |
| Миграции | Alembic ^1.16.1 |
| Аутентификация | python-jose (JWT, cryptography), passlib + bcrypt |
| PDF | weasyprint ^65.1, pdfkit, jinja2 |
| QR-коды | qrcode ^8.2, pillow |
| Логирование | structlog ^24.4.0 (JSON-логи + request middleware) |
| Мониторинг ошибок | sentry-sdk[fastapi] ^2.19.0 (опционально) |
| Rate limiting | slowapi ^0.1.9 |
| Email | resend ^2.32.2 (опционально) |
| Dev/Test | pytest ^8.3, pytest-asyncio ^0.24, httpx ^0.28, black, isort, mypy |

### Frontend
| Компонент | Технология / версия |
|---|---|
| Framework | React ^19.0.0, TypeScript ~5.7.2 |
| State | Redux Toolkit + RTK Query, redux-persist |
| Стили | Tailwind CSS |
| Сборка | Vite ^6.1.0 |
| Маршрутизация | react-router |

### Инфраструктура
- Docker (отдельные образы `Dockerfile-backend`, `Dockerfile-frontend`, плюс комбинированный корневой `Dockerfile`)
- Деплой: не задеплоено сейчас — ранее работало на Fly.io как два независимых приложения (`leadflow-backend`, `leadflow-frontend` через nginx), эта настройка убрана, переезд на новый хостинг не выполнен
- CI/CD: GitHub Actions (`.github/workflows/deploy.yml`) — только тесты на PostgreSQL 15 при push/PR в `main`, без деплоя
- Мониторинг: health-check эндпоинт + UptimeRobot (опционально), Sentry (опционально)

---

## 3. Архитектура backend (`backend/app/`)

Единая слоистая архитектура для всех 30 доменов:

```
api/          30 роутеров — тонкий HTTP-слой (валидация запроса, вызов репозитория)
repositories/ вся бизнес-логика и SQL (async SQLAlchemy)
models/       30 ORM-моделей
schemas/      Pydantic v2: раздельные Create / Update / Out / Read схемы
core/         config.py, database.py, dependencies.py, security.py, limiter.py, logging_config.py
utils/        pdf.py, barcode_utils.py, stock.py, email.py, init_*.py (сидинг)
templates/    Jinja2: supply_invoice.html, email_registration.html, email_approval.html
```

### Конфигурация (`core/config.py`)
Настройки через `pydantic_settings.BaseSettings`, читаются из `.env`:
- Обязательные: `DATABASE_URL`, `SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Опциональные: `ADMIN_FULL_NAME`, `BASE_URL` (используется для определения `secure` cookie через `startswith("https://")`, дефолт `http://localhost:8000`), `FRONTEND_URL` (дефолт `http://localhost:5173`, используется в ссылке сброса пароля), `SENTRY_DSN`
- Email-блок (опционален, по умолчанию `RESEND_API_KEY=None`): `RESEND_API_KEY`, `MAIL_FROM` (дефолт `onboarding@resend.dev`)

### Подключение к БД (`core/database.py`)
```python
create_async_engine(
    DATABASE_URL, echo=False, future=True,
    pool_size=20, max_overflow=10, pool_timeout=30, pool_pre_ping=True
)
```
`SessionLocal` — async sessionmaker с `expire_on_commit=False`.
**Схема БД создаётся через `Base.metadata.create_all`** при старте приложения (`init_db()`), импортируя все 30 моделей. Alembic присутствует, но baseline-миграция пустая — реального пути миграции схемы на проде нет (см. раздел "Риски").

### Жизненный цикл приложения (`main.py`, lifespan)
1. Инициализация Sentry (если задан `SENTRY_DSN`, `traces_sample_rate=0.2`)
2. `init_db()` — создание таблиц
3. Сидинг: роли → admin-пользователь → статусы заказов → типы денежных потоков → должности

### Middleware и безопасность приложения
- `RequestLoggingMiddleware` (кастомный, на `BaseHTTPMiddleware`) — генерирует `request_id` (uuid4[:8]), биндит в structlog contextvars, логирует `method/path/status_code/duration_ms` в JSON
- `SlowAPIMiddleware` + handler для `RateLimitExceeded` → 429
- `CORSMiddleware`: `allow_origins=["http://localhost", "http://localhost:5173/5174/5175", "http://localhost:3000"]` (прод-домен пока не задан — добавится при выборе нового хостинга), `allow_credentials=True`, методы и заголовки — `*`

### Аутентификация и авторизация
- `POST /auth/login` → httpOnly JWT cookie `access_token`, `secure=is_https` (вычисляется из `BASE_URL`)
- `Depends(get_current_user)` — на всех защищённых маршрутах (читает и валидирует JWT из cookie)
- `Depends(is_admin)` — дополнительно на админ-маршрутах
- Роли проверяются по строке `"admin"`; всё остальное — "обычный" пользователь со scoped-доступом (например, менеджер видит только свои заказы)
- Регистрация (`/auth/register`) создаёт пользователя со статусом pending → требует одобрения админом (`PUT /users/{id}/approve`)
- Rate limiting: `/auth/login` — 5 req/min, `/auth/register` — 3 req/min

---

## 4. Модель данных (30 сущностей)

```
branch, brand, budget, cash_gap_forecast, cashflow, cashflow_category,
cashflow_type, category, customer, customer_type, kpi_rule,
monthly_target, notification, order, order_history, order_item,
order_status, payment_method, payroll, position, product,
product_stock, role, stock_log, subcategory, supplier, supply,
supply_item, user, warehouse
```

Все внешние ключи (`ondelete`) настроены как **`SET NULL`** (не `CASCADE`) — удаление сущности не каскадирует, а оставляет связанные записи с `NULL` в FK-поле. Это осознанное архитектурное решение для сохранения истории (например, заказы остаются в системе после удаления клиента/товара).

---

## 5. API — карта эндпоинтов (152 эндпоинта, 30 роутеров)

| Роутер | Эндпоинты (метод + путь) |
|---|---|
| `health` | `GET /health` |
| `auth` | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| `users` | `GET /users/pending`, `GET /users/`, `GET /users/me`, `GET /users/me/stats`, `GET /users/{id}`, `GET /users/{id}/stats`, `PATCH /users/{id}/admin`, `PATCH /users/me/password`, `PATCH /users/me`, `DELETE /users/{id}`, `PUT /users/{id}/approve`, `DELETE /users/pending/{id}` |
| `categories` | CRUD (`GET/POST/PATCH/DELETE`) |
| `subcategories` | CRUD |
| `brands` | CRUD |
| `branches` | CRUD |
| `warehouses` | `GET/GET/POST/PATCH/DELETE` |
| `products` | `GET /`, `GET /export-csv`, `POST /import-csv`, `GET /{id}`, `GET /{id}/qr`, `GET /{id}/qr/download`, `POST /`, `PATCH /{id}`, `DELETE /{id}` |
| `product_stocks` | `POST/GET/GET/PATCH/DELETE` |
| `customer_types` | CRUD |
| `customers` | `GET /`, `GET /{id}`, `POST /`, `PATCH /{id}`, `DELETE /{id}` |
| `order_statuses` | `GET /`, `POST /` |
| `orders` | `POST /`, `PATCH /{id}`, `GET /`, `GET /{id}`, `PATCH /{id}/confirm`, `PATCH /{id}/status`, `GET /{id}/history`, `DELETE /{id}` |
| `order_items` | `POST/PATCH/DELETE` |
| `suppliers` | `GET/GET/POST/PATCH/DELETE` |
| `supplies` | `POST /`, `GET /`, `GET /{id}`, `GET ...` (PDF), `PATCH /{id}`, `DELETE /{id}` |
| `payment_methods` | CRUD |
| `roles` | `GET /` |
| `positions` | CRUD |
| `cashflow_meta` | CRUD категорий + типов денежных потоков (2 подресурса) |
| `cashflows` | `GET /` |
| `budgets` | CRUD |
| `cash_gaps` | CRUD (прогноз кассовых разрывов) |
| `monthly_targets` | `POST /` (upsert), `GET /`, `DELETE /{id}` |
| `kpi_rules` | `GET/POST/PATCH/DELETE` |
| `payrolls` | `GET /`, 3×`POST` (генерация/пересчёт), `PATCH /{id}`, `DELETE /{id}` |
| `analytics` | см. ниже |
| `supply_analytics` | `GET /daily`, `GET /top-suppliers`, `GET /top-supplied-products` |
| `stock_logs` | `GET /` |
| `notifications` | `GET ""`, `GET /unread-count`, `PATCH /{id}/read`, `PATCH /read-all` |

### `analytics` — детально (20 эндпоинтов)
- `GET /analytics/kpi-summary` — KPI по заказам/клиентам за месяц
- `GET /analytics/sales-by-month`
- `GET /analytics/kpi/revenue-profit`
- `GET /analytics/recent-orders`
- `GET /analytics/order-status-summary`
- `GET /analytics/daily` (DailyIncome)
- `GET /analytics/daily-orders` (DailyOrders)
- `GET /analytics/summary` (OrderSummary)
- `GET /analytics/monthly-summary`
- `GET /analytics/orders-by-manager` (ManagerIncome)
- `GET /analytics/orders-by-status` (OrderStatusCount)
- `GET /analytics/monthly-target-summary`
- `GET /analytics/monthly-target/{manager_id}`
- `GET /analytics/leaderboard`
- `GET /analytics/kpi/extended`
- `GET /analytics/supply/top-products`
- `GET /analytics/abc-analysis` — ABC-анализ товаров
- `GET /analytics/pnl?year=&month=` — месячный P&L (выручка, COGS, валовая прибыль, ФОТ, чистая прибыль)
- `GET /analytics/pnl/yearly?year=` — P&L за 12 месяцев (для графика)
- `GET /analytics/xyz-analysis` (XYZAnalysisResult) — XYZ-анализ товаров

---

## 6. Бизнес-логика — ключевые точки

| Функция | Backend | Frontend |
|---|---|---|
| Подтверждение заказа + списание со склада | `repositories/order.py` + `utils/stock.py` | `pages/orders/OrderDetailsPage.tsx` |
| Возврат остатков при удалении/отмене заказа | `utils/stock.py::restore_stock_for_order` (по `order_id`) | — |
| Генерация ФОТ + расчёт KPI | `repositories/payroll.py` | `pages/payroll/PayrollManagement.tsx` |
| ABC / XYZ-анализ | `repositories/analytics.py` | `components/ecommerce/` |
| PDF-накладная поставки с QR | `utils/pdf.py` + `templates/supply_invoice.html` | `store/api/suppliesApi.ts` |
| История изменений заказа (аудит) | `models/order_history.py`, `repositories/order_history.py` | таймлайн на `OrderDetailsPage.tsx` |
| In-app уведомления | `models/notification.py`, `repositories/notification.py`, BackgroundTasks при создании заказа / одобрении | `NotificationDropdown.tsx`, poll каждые 30с |
| Импорт/экспорт каталога CSV | `repositories/product.py::import_from_csv/get_all_for_export`, upsert по SKU | `catalogApi.ts` (queryFn + StreamingResponse, UTF-8 BOM) |
| Email-уведомления (регистрация/одобрение) | `utils/email.py`, BackgroundTasks, опционально через `MAIL_*` | — |

---

## 7. Frontend — структура (`frontend/src/`)

```
store/
  slices/authSlice.ts          — состояние авторизации (user, isAuthenticated, initialized)
  api/                          — 22 RTK Query слайса (baseQueryWithReauth)
  middleware/authErrorMiddleware.ts — автологаут при 401
  store.ts                      — redux-persist (персистится только auth slice)
hooks/
  useRoleAccess.ts              — isAdmin, isManager, canEdit, canDelete
  reduxHooks.ts                 — типизированные dispatch/selector
layout/                          — AppLayout, AppSidebar, AppHeader, Backdrop
pages/                            — 49 страниц по доменам
```

### Маршруты (`App.tsx`)
Защищены `<RequireAuth>` (валидирует cookie-сессию через `fetchCurrentUser` при монтировании). Незащищённые: `/signin`, `/signup`.

Полный список защищённых маршрутов:
`/`, `/users`, `/registration-requests`, `/customers`, `/customer-types`, `/orders`, `/orders/create`, `/orders/:id`, `/warehouses`, `/warehouses/:warehouseId/inventory`, `/stock`, `/stock/logs`, `/supplies`, `/supplies/create`, `/supplies/:id`, `/supplies/:id/edit`, `/suppliers`, `/finance`, `/finance/cashflow-meta`, `/finance/monthly-targets`, `/finance/pnl`, `/payroll`, `/branches`, `/config/general`, `/config/payment-methods`, `/config/positions`, `/config/notifications`, `/products`, `/products/create`, `/catalog/products`, `/catalog/products/create`, `/catalog/products/:id/edit`, `/categories`, `/profile` (+ демо-страницы UI-кита: `/form-elements`, `/basic-tables`, `/calendar`)

### API-слайсы (22)
`analyticsApi`, `authApi`, `baseQuery`, `branchesApi`, `budgetApi`, `cashGapApi`, `cashflowApi`, `catalogApi`, `customerTypesApi`, `customersApi`, `kpiRulesApi`, `monthlyTargetsApi`, `notificationsApi`, `ordersApi`, `paymentMethodsApi`, `payrollApi`, `positionsApi`, `rolesPositionsApi`, `stockApi`, `stockLogsApi`, `suppliersApi`, `suppliesApi`, `userApi`, `userStatsApi`, `usersApi`, `usersManagementApi`, `warehouseApi`, `warehousesApi`

Все используют `baseQueryWithReauth` (`credentials: 'include'`), который на 401 диспатчит `logoutUser` и редиректит на `/signin`.

---

## 8. Тестирование и CI/CD

### Тесты (`backend/tests/`)
- `conftest.py`, `test_health.py`, `test_auth.py`, `test_products.py`
- `asyncio_mode = "auto"` (pytest-asyncio)
- Требуют живую PostgreSQL по `DATABASE_URL`

### CI/CD (`.github/workflows/deploy.yml`)
```
push/PR → main:
  job test: postgres:15 (service) → poetry install --with dev → pytest -v
```
Деплой-джобов сейчас нет (раньше деплоили на Fly.io через `flyctl deploy`, эта настройка убрана). Требуемые GitHub Secrets: `SECRET_KEY` (для прогона тестов).

---

## 9. Деплой / инфраструктура

Сейчас система не задеплоена ни на каком хостинге — ранее работала на двух приложениях Fly.io (`leadflow-backend` на `Dockerfile-backend`, `leadflow-frontend` на `Dockerfile-frontend`/nginx), эта настройка (`fly.backend.toml`, `fly.frontend.toml`) удалена. Переезд на новый сервис в планах, конкретный хостинг пока не выбран.

Что осталось пригодным для любого следующего хостинга:
- Комбинированный корневой `Dockerfile`: `docker-entrypoint.sh` запускает uvicorn в фоне, затем nginx на переднем плане (backend+frontend в одном контейнере)
- Отдельные `Dockerfile-backend`/`Dockerfile-frontend`, если нужно деплоить как два сервиса
- Health-check: `GET /health` → `{"status":"ok","db":"ok","version":"0.1.0"}`
- Минимальный набор секретов для следующего хостинга: `SECRET_KEY`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, опционально `SENTRY_DSN`, `RESEND_API_KEY`

---

## 10. Статус безопасности

### Закрытые проблемы (предыдущие аудиты)
| Проблема | Статус | Где исправлено |
|---|---|---|
| Хардкод `SECRET_KEY` | ✅ исправлено | `core/config.py` (из `.env` через pydantic-settings) |
| `/users/{id}/approve` без auth-guard | ✅ исправлено | `Depends(is_admin)` в `api/users.py` |
| `secure=False` на JWT cookie | ✅ исправлено | `secure=is_https`, вычисляется из `BASE_URL` |
| `echo=True` в SQLAlchemy engine | ✅ исправлено | `echo=False` в `core/database.py` |
| Дублирование `get_db()` | ✅ исправлено | оба роутера импортируют из `core/dependencies` |
| Брутфорс на `/auth/login`, `/auth/register` | ✅ исправлено | slowapi rate limiting (5/мин, 3/мин) |

### Открытый риск (высокий приоритет)
**Схема БД через `Base.metadata.create_all`, а не Alembic.** Текущая baseline-миграция (`backend/alembic/versions/`) — пустая. На живой БД с данными изменение моделей не имеет управляемого пути миграции (нет `alembic upgrade`/`downgrade` для текущей структуры). Рекомендация: сгенерировать реальную `initial_schema` миграцию (`alembic revision --autogenerate`) с зафиксированной текущей схемой как точкой отсчёта, после чего все последующие изменения моделей проводить только через Alembic-миграции, а `create_all` убрать из `init_db()`.

---

## 11. Известные ограничения

1. Alembic baseline пустая — нет реального пути миграции схемы (см. п.10)
2. Раздел `/config/notifications` — UI присутствует, помечен как `comingSoon: true`, логика не реализована
3. CORS сейчас разрешает только localhost-порты для разработки — прод-домен не задан, т.к. система не задеплоена; при выборе нового хостинга нужно добавить его origin в `main.py`
4. Email и Sentry — опциональные интеграции (no-op при отсутствии переменных окружения), для активации нужна настройка `RESEND_API_KEY`/`SENTRY_DSN` там, где в итоге будет жить прод

---

## 12. Сводная таблица масштаба

| Метрика | Значение |
|---|---|
| Backend файлов (.py) | 152 |
| Backend строк кода | ~8 100 |
| Frontend файлов (.ts/.tsx) | 254 |
| Frontend строк кода | ~41 800 |
| API-эндпоинтов | 152 |
| ORM-моделей | 30 |
| RTK Query API-слайсов | 22 |
| Страниц (route-level) | 49 |
