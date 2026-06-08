# Setup & Operations Guide

Что нужно сделать вручную — сгруппировано по темам. Обновляется по ходу разработки.

---

## Первый запуск (локально)

```bash
# 1. Создай backend/.env на основе примера ниже и заполни реальными значениями
# 2. Запусти БД + backend
docker compose up db backend
# 3. В отдельном терминале — frontend
cd frontend && npm install && npm run dev
```

**`backend/.env` — минимальный шаблон:**
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5434/crm_db
SECRET_KEY=<openssl rand -hex 32>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ВашПароль
ADMIN_FULL_NAME=Администратор
BASE_URL=http://localhost:8000
SENTRY_DSN=           # оставь пустым пока не подключишь Sentry
```

> Файл `.env` в `.gitignore` — не попадает в репозиторий.

---

## Деплой на Fly.io

```bash
# Backend
fly deploy --config fly.backend.toml

# Frontend
fly deploy --config fly.frontend.toml

# Или через корневой Dockerfile (backend + frontend в одном контейнере)
fly deploy
```

**Secrets на Fly.io** (один раз при первом деплое или при смене):
```bash
fly secrets set SECRET_KEY="..." --app leadflow-backend
fly secrets set DATABASE_URL="postgresql+asyncpg://..." --app leadflow-backend
fly secrets set ADMIN_EMAIL="..." --app leadflow-backend
fly secrets set ADMIN_PASSWORD="..." --app leadflow-backend
fly secrets set SENTRY_DSN="https://..." --app leadflow-backend   # опционально
```

---

## Alembic — работа с миграциями

```bash
cd backend

# Сгенерировать миграцию после изменения моделей (требуется рабочая БД)
alembic revision --autogenerate -m "описание изменений"

# Применить все миграции
alembic upgrade head

# Откатить последнюю
alembic downgrade -1
```

> **Статус:** текущая baseline-миграция пустая — таблицы создаются через `Base.metadata.create_all`.
> Следующий шаг: сгенерировать реальную `initial_schema` миграцию и убрать `create_all` из `main.py`.

---

## Sentry — мониторинг ошибок

1. Зарегистрируйся на [sentry.io](https://sentry.io) (бесплатный план до 5K ошибок/мес)
2. Создай проект: **FastAPI / Python**
3. Скопируй DSN вида `https://abc123@o0.ingest.sentry.io/0`
4. Добавь в `backend/.env`:
   ```
   SENTRY_DSN=https://abc123@o0.ingest.sentry.io/0
   ```
5. На проде: `fly secrets set SENTRY_DSN="https://..." --app leadflow-backend`

---

## UptimeRobot — мониторинг доступности

1. Зарегистрируйся на [uptimerobot.com](https://uptimerobot.com) (бесплатно)
2. Добавь монитор: **HTTP(S)** → `https://leadflow-backend.fly.dev/health`
3. Интервал: **5 минут**
4. Уведомления: email или Telegram

Эндпоинт `GET /health` отвечает `{"status":"ok","db":"ok","version":"0.1.0"}`.

---

## Poetry — управление зависимостями

```bash
cd backend

# Установить все зависимости (после git pull или смены pyproject.toml)
poetry install

# Добавить новую зависимость
poetry add package-name

# Обновить lock-файл
poetry lock
```

После добавления `structlog` и `sentry-sdk` в этой сессии нужно запустить `poetry install`.

---

## Текущий статус изменений по сессиям

### День 1 — Критическая безопасность ✅
| Что | Файл |
|---|---|
| `SECRET_KEY` перенесён в `.env` | `core/config.py`, `core/security.py` |
| Защита `/users/{id}/approve` | `api/users.py` |
| `secure=True` для JWT cookie | `api/auth.py` |
| `echo=False` в SQLAlchemy engine | `core/database.py` |

### День 2 — Инфраструктура ✅
| Что | Файл |
|---|---|
| Дедупликация `get_db()` | `api/auth.py`, `api/users.py` |
| `GET /health` endpoint | `api/health.py` |
| `alembic upgrade head` при старте | `docker-entrypoint.sh` |

### День 3 — Логирование и индексы ✅
| Что | Файл |
|---|---|
| JSON structlog + request middleware | `main.py`, `core/logging_config.py` |
| Sentry (опционально через `SENTRY_DSN`) | `main.py` |
| Миграция с 6 индексами | `alembic/versions/c3d4e5f6a7b8_...py` |
| Зависимости structlog + sentry-sdk | `pyproject.toml` |

### День 4 — Finance UI ✅
| Что | Файл |
|---|---|
| Страница `/finance` — таблица + фильтры + карточки | `pages/finance/Finance.tsx` |
| Исправлен URL и интерфейсы `cashflowApi.ts` | `store/api/cashflowApi.ts` |

### День 6 — Pagination + Password change ✅
| Что | Файл |
|---|---|
| `skip/limit` params на эндпоинтах products, customers, users | `api/products.py`, `api/customers.py`, `api/users.py` |
| `skip/limit` в репозиториях | `repositories/product.py`, `repositories/customer.py`, `repositories/user.py` |
| `PATCH /users/me/password` — смена пароля | `api/users.py`, `repositories/user.py` |
| Схема `PasswordChange` (min 8 символов) | `schemas/user.py` |
| Frontend: `useChangePasswordMutation` | `store/api/userApi.ts` |
| Вкладка "Безопасность" с формой смены пароля | `pages/UserProfiles.tsx` |
| Пагинация (20 на странице) на странице товаров | `pages/catalog/Products.tsx` |
| Пагинация (20 на странице) на странице клиентов | `pages/customers/Customers.tsx` |

### День 5 — Connection pool + Tests + CI/CD ✅
| Что | Файл |
|---|---|
| Connection pooling (`pool_size=20, max_overflow=10, pool_pre_ping=True`) | `core/database.py` |
| Integration tests: health, auth, products | `backend/tests/` |
| pytest + pytest-asyncio + httpx в dev зависимостях | `pyproject.toml` |
| GitHub Actions: test → deploy backend + frontend | `.github/workflows/deploy.yml` |
| README с инструкцией по запуску, тестам, деплою | `README.md` |

---

## Что осталось из Фазы 0

- [ ] Сгенерировать реальную Alembic-миграцию initial_schema (`alembic revision --autogenerate`)
- [ ] Запустить `poetry install` в `backend/` (новые зависимости: structlog, sentry-sdk, pytest, pytest-asyncio, httpx)

## CI/CD — что нужно добавить в GitHub Secrets

Перейди в репозиторий → **Settings → Secrets and variables → Actions → New repository secret**:

| Секрет | Значение |
|---|---|
| `FLY_API_TOKEN` | Получить: `fly tokens create deploy -x 999999h` |
| `SECRET_KEY` | Тот же ключ что в `backend/.env` |

После этого каждый push в `main` будет автоматически:
1. Запускать тесты с PostgreSQL в GitHub Actions
2. Деплоить backend и frontend на Fly.io

### День 7 — Rate Limiting + Email уведомления ✅
| Что | Файл |
|---|---|
| `slowapi` + `fastapi-mail` в зависимостях | `pyproject.toml` |
| `core/limiter.py` — экземпляр Limiter | `core/limiter.py` |
| Rate limit: `/auth/login` 5 req/min, `/auth/register` 3 req/min | `api/auth.py` |
| SlowAPIMiddleware + 429 обработчик | `main.py` |
| Опциональные настройки SMTP в Settings | `core/config.py` |
| `utils/email.py` — send_registration_email, send_approval_email | `utils/email.py` |
| HTML-шаблоны писем (регистрация + одобрение) | `templates/email_*.html` |
| Email при регистрации (BackgroundTasks) | `api/auth.py` |
| Email при одобрении (BackgroundTasks) | `api/users.py` |

## Email — настройка SMTP

Email-уведомления полностью опциональны — без SMTP-настроек система работает как раньше.

### Gmail (рекомендуется для старта)

1. Включи [2-Step Verification](https://myaccount.google.com/security)
2. Создай [App Password](https://myaccount.google.com/apppasswords) для "Mail"
3. Добавь в `backend/.env`:
   ```
   MAIL_USERNAME=youraddress@gmail.com
   MAIL_PASSWORD=xxxx xxxx xxxx xxxx   # App Password (16 символов)
   MAIL_FROM=youraddress@gmail.com
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_STARTTLS=true
   MAIL_SSL_TLS=false
   ```

### Fly.io secrets (продакшн)

```bash
fly secrets set MAIL_USERNAME="..." --app leadflow-backend
fly secrets set MAIL_PASSWORD="..." --app leadflow-backend
fly secrets set MAIL_FROM="..." --app leadflow-backend
fly secrets set MAIL_SERVER="smtp.gmail.com" --app leadflow-backend
```

### Поведение при отсутствии настроек

Если `MAIL_SERVER` не задан — письма не отправляются и ошибок нет. Подключение email не требует изменений кода.

### День 8 — Мобильная адаптивность заказов (USR-4) ✅
| Что | Файл |
|---|---|
| OrderForm: full-screen sheet на mobile, компактный progress bar | `components/orders/OrderForm.tsx` |
| OrderForm: чекмарки на пройденных шагах, уменьшенные grid-отступы | `components/orders/OrderForm.tsx` |
| OrdersTable: card view на mobile (`< sm`), таблица скрыта | `components/orders/OrdersTable.tsx` |
| AllOrders: заголовок стекируется на mobile | `pages/orders/AllOrders.tsx` |
| OrderDetailsPage: уменьшен padding на mobile (`p-3 sm:p-6`) | `pages/orders/OrderDetailsPage.tsx` |

### День 9 — P&L отчёт (ANA-2) ✅
| Что | Файл |
|---|---|
| `get_pnl_report(year, month)` — выручка, COGS, валовая прибыль, payroll, чистая прибыль | `repositories/analytics.py` |
| `get_pnl_yearly(year)` — 12 месяцев P&L для графика | `repositories/analytics.py` |
| `GET /analytics/pnl?year=&month=` эндпоинт | `api/analytics.py` |
| `GET /analytics/pnl/yearly?year=` эндпоинт | `api/analytics.py` |
| Схемы `PnLReport` и `PnLMonthly` | `schemas/analytics.py` |
| `analyticsApi` — RTK Query slice с двумя хуками | `store/api/analyticsApi.ts` |
| Регистрация `analyticsApi` в store | `store/store.ts` |
| Страница `/finance/pnl` — карточки + breakdown + годовой график | `pages/finance/PnLReport.tsx` |
| Роут `/finance/pnl` | `App.tsx` |
| Пункт "P&L отчёт" в разделе Финансы сайдбара | `layout/AppSidebar.tsx` |

### День 10 — In-app уведомления (NOT-2) ✅
| Что | Файл |
|---|---|
| `Notification` модель (user_id, title, message, is_read, type, entity_id) | `models/notification.py` |
| Схемы `NotificationOut`, `UnreadCountOut` | `schemas/notification.py` |
| Репозиторий: get_user_notifications, get_unread_count, mark_read, mark_all_read, create_notification, notify_admins | `repositories/notification.py` |
| `GET /notifications`, `GET /notifications/unread-count`, `PATCH /{id}/read`, `PATCH /read-all` | `api/notifications.py` |
| Регистрация `notifications` роутера | `main.py` |
| `notification` добавлен в `init_db` для create_all | `core/database.py` |
| Уведомление всем админам при создании заказа (BackgroundTasks) | `api/orders.py` |
| Уведомление пользователю при одобрении аккаунта | `api/users.py` |
| `notificationsApi` — RTK Query slice (poll 30s) | `store/api/notificationsApi.ts` |
| Регистрация `notificationsApi` в store | `store/store.ts` |
| `NotificationDropdown` — список, badge, "прочитать все", навигация по клику | `components/header/NotificationDropdown.tsx` |
| Колокольчик с красным badge в AppHeader | `layout/AppHeader.tsx` |

### День 11 — История изменений заказа (ADM-6) ✅
| Что | Файл |
|---|---|
| `OrderHistory` модель (order_id, user_id, action, description, created_at) | `models/order_history.py` |
| Схемы `OrderHistoryOut`, `HistoryUserOut` | `schemas/order_history.py` |
| `add_entry`, `get_order_history` | `repositories/order_history.py` |
| `GET /orders/{id}/history` эндпоинт | `api/orders.py` |
| `order_history` добавлен в `init_db` | `core/database.py` |
| Лог "Заказ создан" при создании | `repositories/order.py` |
| Лог "Подтверждён" / "Подтверждение снято" | `repositories/order.py` |
| Лог "Статус изменён: X → Y" / "Заказ отменён: причина" | `repositories/order.py` |
| `OrderHistoryEntry` интерфейс + `useGetOrderHistoryQuery` | `store/api/ordersApi.ts` |
| Таймлайн "История изменений" на странице заказа | `pages/orders/OrderDetailsPage.tsx` |

### День 12 — Импорт/экспорт каталога CSV (ADM-3) ✅
| Что | Файл |
|---|---|
| `get_all_for_export` — все товары без лишних JOIN | `repositories/product.py` |
| `import_from_csv` — upsert по SKU, счётчики created/updated/errors | `repositories/product.py` |
| `GET /products/export-csv` — StreamingResponse с UTF-8 BOM | `api/products.py` |
| `POST /products/import-csv` — UploadFile, только для admin | `api/products.py` |
| `ImportCsvResult` интерфейс + `useImportProductsCsvMutation` (queryFn + plain fetch) | `store/api/catalogApi.ts` |
| Кнопки "Экспорт CSV" / "Импорт CSV" в заголовке страницы | `pages/catalog/Products.tsx` |
| Баннер результата импорта (created/updated/errors) с закрытием | `pages/catalog/Products.tsx` |

## Что следующее (Фаза 2)

- [x] P&L отчёт (ANA-2) — сводный доходы/расходы/прибыль по месяцам ✅
- [x] In-app уведомления (NOT-2) — колокольчик в хедере ✅
- [x] История изменений заказа (ADM-6) ✅
- [x] Импорт/экспорт каталога CSV (ADM-3) ✅

## Фаза 2 завершена ✅
