# Changelog

Формат — по мотивам [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/). Ссылки на пункты — из аудита в [`docs/known-issues.md`](docs/known-issues.md) и [`docs/gaps-and-roadmap.md`](docs/gaps-and-roadmap.md).

## 2026-08-29 — Закрытие критичных и высокоприоритетных находок аудита

### Исправлено — целостность данных (критично)

- **Удаление клиента больше не стирает его заказы.** `Customer.orders` — убран `cascade="all, delete-orphan"`; при удалении клиента заказы сохраняются с `customer_id = NULL` (как и было задумано по FK `ondelete="SET NULL"`, но раньше не соблюдалось на уровне ORM). `backend/app/models/customer.py`.
- **Удаление филиала больше не стирает склады, остатки и историю поставок.** Аналогичный фикс для `Branch.warehouses`. `backend/app/models/branch.py`.

### Исправлено — безопасность и авторизация (критично/высокий приоритет)

- **Проверка владения заказом** добавлена на `PATCH /orders/{id}/confirm`, `PATCH /orders/{id}/status` и все три эндпоинта `/orders/{id}/items/*` (было: любой авторизованный пользователь мог подтвердить/отменить/изменить позиции чужого заказа, зная его ID). Переиспользован уже существующий `is_order_owner_or_admin`. `backend/app/api/orders.py`, `backend/app/api/order_items.py`.
- **Складские write-операции** (`POST /stock/`, `PATCH /stock/{id}`, `POST /stock/transfer`, `DELETE /stock/{id}`) теперь требуют RBAC-права `stock.create`/`stock.update`/`stock.delete` (было: только авторизация, без проверки роли/права). `backend/app/api/product_stocks.py`.
- **RBAC доведён до операций записи** (было: гранулярно только чтение, все "тонкости" отдавались на грубую проверку "админ/не админ"): `products.create/update/delete`, `customers.create/update/delete`, `orders.delete`, `supplies.create/update/delete` теперь проверяются через `require_permission(...)`. Поведение для существующих пользователей не меняется (роль Admin по-прежнему имеет все права) — открывается возможность выдать кастомной роли, например, только `products.update` без полного admin-доступа. `backend/app/api/{products,customers,orders,supplies}.py`.
- **Фронтенд определяет админа через RBAC, а не легаси `role.name`.** `useRoleAccess.isAdmin` больше не читает несуществующее в ответе `/users/me` поле `role.name` / хрупкое допущение `role_id === 1` — теперь берёт вычисленный на бэкенде `is_admin` (тот же источник истины, что использует `Depends(is_admin)` на API). Практическое следствие: `/settings/roles` (страница управления самим RBAC) и другие admin-only разделы UI теперь корректно доступны пользователю с админ-правами независимо от того, как именно эти права были назначены. Добавлено поле `is_admin` в `GET /users/me`. `backend/app/schemas/user.py`, `backend/app/api/users.py`, `frontend/src/hooks/useRoleAccess.ts`, `frontend/src/types/auth.ts`.

### Исправлено — деплой на Render (критично)

- **Восстановлена автоматическая подстановка `BASE_URL`/`FRONTEND_URL` из `RENDER_EXTERNAL_URL`** — функция `_default_urls_from_render` была случайно удалена коммитом `295663b` при чистке "неиспользуемого" кода, хотя `render.yaml` рассчитывает именно на неё. Без этого прод-деплой на Render отправлял бы JWT-куки с `secure=False` (регресс уже закрытой ранее уязвимости) и ссылки сброса пароля вели бы на `localhost`. `backend/app/core/config.py`.
- Удалены мёртвые `Dockerfile-backend`/`Dockerfile-frontend` (легаси-схема "два сервиса" под Fly.io, ничем не используются — ни `render.yaml`, ни `docker-compose.yml`).
- **Исправлен реально работающий, но битый `nginx/default.conf`** (используется `docker-compose up` через `frontend/Dockerfile`) — проксировал `/api/` на мёртвый `https://leadflow-backend.fly.dev/` вместо локального backend-контейнера. Теперь `proxy_pass http://backend:8000/` (резолвится через Docker Compose DNS).

### Добавлено — тестовое покрытие (критично)

- **`backend/tests/test_orders.py`** (9 тестов): резервирование остатка при создании заказа, отказ при нехватке товара, списание при подтверждении и восстановление при снятии подтверждения, освобождение резерва/восстановление остатка при отмене и удалении (подтверждённого и неподтверждённого заказа), проверка владения (чужой менеджер получает 403, владелец и админ — нет).
- **`backend/tests/test_payroll.py`** (8 тестов): генерация ведомости за месяц, защита от повторной генерации, пересчёт (и защита пересчёта уже выплаченной), выплата (создаёт запись в `cash_flows`, защита от повторной выплаты), защита от удаления выплаченной записи.
- Тестовый прогон рассинхронизировался с лимитом `/auth/login` (5/мин) при большом числе логинов в одном прогоне — добавлен флаг `DISABLE_RATE_LIMIT`, включается автоматически в `conftest.py` для тестового окружения (в `.env` для реальной среды ничего не меняется, лимит остаётся активным).

### Найдено и исправлено попутно (обнаружено именно благодаря новым тестам)

- 🐛 **`POST /payrolls/{id}/pay` падал с 500 на каждом вызове** — колонка `payrolls.paid_at` была объявлена как `DateTime` без таймзоны, а код записывал `datetime.now(timezone.utc)` (offset-aware); asyncpg отклонял такую запись. Функция "отметить зарплату выплаченной" не работала никогда. Исправлено (модель + миграция `a1b2c3d4e5f6`). `backend/app/models/payroll.py`.
- 🐛 **`PATCH /orders/{id}/status` падал с 500 при отмене *подтверждённого* заказа** — в отличие от `confirm_order`/`create_order`, после `commit()` функция не перезапрашивала заказ с eager-загрузкой связей перед возвратом ответа, из-за чего сериализация `items[].product` иногда не могла лениво подгрузить связь вне async-контекста SQLAlchemy. Исправлено по образцу уже существующего в этом же файле паттерна. `backend/app/repositories/order.py`.

### Не тронуто в этом проходе (осознанно, не входило в scope "критично/высокий")

- Удаление сотрудника всё ещё каскадно стирает зарплатную историю и KPI-планы (`known-issues.md`, п. 3) — это отмечено как бизнес-решение, а не баг рассинхронизации, требует продуктового решения, а не кодового фикса.
- Полное покрытие тестами остальных доменов (поставки, финансы, склад-переводы) — за пределами явно запрошенного "заказы и зарплата".
- Известные уязвимости в зависимостях (`npm audit`/`pip-audit`) — отдельная задача обновления версий, не входит в "критично/высокий" по коду.
- Предсуществующая проблема теста `test_login_unapproved_user` (падает на повторном прогоне без очистки БД — использует захардкоженный email) — не устранялась, т.к. не входит в scope и является более широкой проблемой изоляции тестов, а не критичным/высокоприоритетным пунктом аудита.

## 2026-08-30 — Реальная baseline-миграция Alembic

- **Пустая `baseline`-миграция заменена на настоящую** (`backend/alembic/versions/85a67bec609b_baseline.py`) — создаёт всю текущую схему с нуля вместо пустого no-op. Старая связка "пустой baseline + 9 инкрементальных миграций поверх якобы существующих таблиц" не могла отработать на честно пустой БД (`alembic upgrade head` падал на первой же непустой миграции). Новый baseline сгенерирован через `alembic revision --autogenerate` против пустой Postgres и проверен на отсутствие расхождений с текущими моделями (повторный autogenerate даёт пустой diff). `docker-entrypoint.sh` по-прежнему умеет проставить `stamp head` для БД, поднятых до этого фикса через `create_all`.
- 🐛 **Найдено попутно**: `PasswordResetToken` существовал как файл модели, но не был импортирован в `app/models/__init__.py` — Alembic (через `from app.models import *` в `env.py`) не видел таблицу `password_reset_tokens` вообще, из-за чего будущий autogenerate сгенерировал бы миграцию на её удаление. Импорт добавлен.

## 2026-08-30 — Закрытие пунктов среднего приоритета аудита (`known-issues.md`, пп. 10–13)

### Исправлено — уязвимости в зависимостях (п. 10)

- **Frontend**: `axios` (вместе со всем деревом транзитивных advisory — `form-data` и т.д.) удалён из проекта как часть слияния HTTP-клиентов (см. ниже), `react-router` обновлён `7.17.0 → 7.18.3` (`npm audit fix`). `npm audit --production` теперь: **0 уязвимостей** (было 3 high).
- **Backend**: `pip-audit` было 84 advisory в 20 пакетах → **3 advisory в 3 пакетах** после обновлений:
  - `fastapi` `0.115.12 → 0.141.1` (тянет `starlette 0.46.2 → 1.6.0`, `python-multipart 0.0.20 → 0.0.32` — закрывает 9 + 6 advisory),
  - `cryptography` `45.0.3 → 50.0.1` (закрывает 9 advisory; зафиксирован явно в `pyproject.toml`, раньше был чисто транзитивным через `python-jose[cryptography]` без нижней границы),
  - `pillow` `11.3.0 → 12.3.0` (закрывает 25 advisory),
  - `pyasn1`, `idna`, `click`, `mako`, `pygments`, `python-dotenv`, `ecdsa` обновлены до последних версий с фиксами; `pytest 8→9` и `black 25→26` (dev-only) обновлены вместе с совместимым `pytest-asyncio 0.24→1.4`.
  - **Осталось без фикса**: `pdfkit` (1 advisory, upstream не выпустил патч), `ecdsa` (1 из 2 advisory — таймингова атака на подпись, апстрим официально считает untenable in pure Python; не эксплуатируется в этом проекте, т.к. JWT подписывается HS256, ECDSA-путь `python-jose` не используется), `pip` (сам инструмент, не входит в `poetry.lock`, обновлён локально при разработке).
  - Всё проверено: полный набор тестов (51) зелёный после каждого шага, плюс отдельная ручная проверка логина/JWT (`security.py` использует HS256, не затронут cryptography-бампом на уровне алгоритма), генерации QR (`pillow`) и импорта Excel (`python-multipart`) через прямые запросы к API.

### Исправлено — неиспользуемые зависимости (п. 11)

- `weasyprint` и `aiosqlite` удалены из `pyproject.toml`/`poetry.lock` — ни разу не импортируются в `app/` (PDF идёт через `pdfkit`, тесты используют реальный Postgres, не SQLite).

### Исправлено — мёртвый и рассинхронизированный код (п. 12)

- `frontend/src/pages/supplies/Supplies.tsx` (нерабочая заглушка, не роутится) — удалён.
- `backend/app/models/order_item.py` — удалён закомментированный `# @property def product_name`.
- `backend/app/core/logging_config.py` — упрощён мёртвый тернарник `... if False else ...` до одной строки.
- Докстринги `backend/app/rbac/dependencies.py` и `backend/app/rbac/models.py` приведены в соответствие с реальным состоянием (RBAC подключён к роутерам и является источником истины для admin-доступа — Stage D, а не "ещё не подключено, Stage C").
- **Слиты два независимых HTTP-клиента авторизации.** `frontend/src/api/axios.ts` (отдельный `axios`-клиент для login/logout/getCurrentUser) удалён; `authSlice.ts` теперь использует RTK Query (`authApi.login`/`authApi.logout`, уже существующий `userApi.getCurrentUser`) через `dispatch(...).unwrap()` — тот же паттерн, что и остальные 22 API-среза. Попутно найден и удалён полностью неиспользуемый, рассинхронизированный дубликат `frontend/src/middlewares/authErrorMiddleware.ts` (более старая, более грубая версия уже подключённого `store/middleware/authErrorMiddleware.ts` — не импортировался нигде), а также мёртвый `frontend/src/utils/fetchWithAuth.ts`. `baseQuery.ts` поправлен, чтобы не перетирать `Content-Type`, явно заданный конкретным запросом (нужно для form-urlencoded `/auth/login`). Проверено: полный набор запросов login → `/users/me` → logout напрямую по HTTP-протоколу воспроизводит то, что теперь отправляет RTK Query (form-urlencoded тело, куки, коды ответов); `tsc --noEmit` и `vite build` — чисто.

### Исправлено — N+1-запрос (п. 13)

- `backend/app/repositories/product.py::get_filtered` — вместо отдельного `SELECT SUM(quantity)` на каждый товар в цикле теперь один агрегирующий запрос с `GROUP BY product_id` на весь список. Проверено сверкой `available_quantity` по нескольким товарам с ручным `SELECT ... GROUP BY` в БД.

### Найдено и исправлено попутно

- 🐛 **`poetry install` был сломан для любого чистого окружения** (в т.ч. CI — все прогоны `.github/workflows/deploy.yml` падали с `backend does not contain any element`, начиная минимум с 2026-08-29): `pyproject.toml` объявлял `packages = [{ include = "backend" }]`, но сам файл лежит внутри `backend/`, так что путь резолвился в несуществующий `backend/backend/`. Исправлено на `{ include = "app" }` (реальный пакет). Воспроизведено и проверено в чистом venv.

### Не тронуто в этом проходе

- 388 строк тестовых пользователей (`*-test-<uuid>@example.com`), накопленные в локальной dev-БД за предыдущие прогоны тестов — не относится к текущей задаче, не трогалось.
- Форматирование `black` не применялось ко всей кодовой базе (145 файлов "would reformat") — `black --check` подтверждён рабочим после мажорного бампа 25→26, но массовое переформатирование не входило в scope.

## 2026-08-31 — Личные задачи/напоминания и движок уведомлений

Реализовано по согласованному плану (`.claude/plans/gentle-leaping-wigderson.md`): личные задачи (без назначения другим сотрудникам), привязка к клиенту/заказу, встроенный (без Redis/Celery) фоновый планировщик напоминаний, email+in-app уведомления с настраиваемыми предпочтениями по типу события.

### Добавлено — бэкенд

- **Модели**: `Task` (`backend/app/models/task.py` — владелец, срок, напоминание, статус/приоритет, необязательные `customer_id`/`order_id`, атомарная метка `reminder_sent_at`), `NotificationType` (расширяемый справочник типов события — новый тип добавляется строкой в БД, без изменения кода) и `NotificationPreference` (email/in_app по типу, с дефолтами из `NotificationType`, если у пользователя нет своей записи). В `Notification` добавлен `read_at` (рядом с существующим `is_read`, оба поддерживаются синхронно) — существующие продюсеры уведомлений (`api/users.py`, `api/orders.py`) не тронуты.
- **API**: `backend/app/api/tasks.py` — CRUD задач текущего пользователя с фильтрами (статус/даты/клиент/заказ), `is_task_owner_or_admin` (по образцу `is_order_owner_or_admin`, без записи в RBAC-матрицу — задачи личные, как `is_self_or_admin`), плюс `?user_id=` для админа. `backend/app/api/notifications.py` дополнен пагинацией и `GET`/`PUT /notifications/preferences`.
- **Фоновая обработка напоминаний**: встроенный `AsyncIOScheduler` (APScheduler) в `lifespan` (`backend/app/main.py`) — интервал задаётся `TASK_REMINDER_INTERVAL_MINUTES`, без отдельного процесса/брокера. Идемпотентность — атомарный `UPDATE ... WHERE reminder_sent_at IS NULL ... FOR UPDATE SKIP LOCKED` в `task_repo.claim_due_reminders`, а не блокировка на уровне планировщика. Служебный `POST /tasks/reminders/process` (заголовок `X-Reminder-Token`, сверяется с `TASK_REMINDER_TOKEN`) вызывает ту же функцию `process_due_reminders`, что и планировщик. Email напоминаний — новая `send_task_reminder_email` в `utils/email.py` с собственным retry (в отличие от `_send_safe`, т.к. джоба планировщика не имеет доступа к `BackgroundTasks`, который работает только внутри HTTP-запроса).
- **Миграция** `4b27405321b7_add_tasks_and_notification_preferences.py` — только новые таблицы/колонка, проверена на пустой БД (полная цепочка миграций + пустой diff после) и накатана на dev-БД.
- **Тесты**: `tests/test_tasks.py` (CRUD, владение, фильтр по `user_id` для админа, привязка к клиенту/заказу), `tests/test_task_reminders.py` (идемпотентность `claim_due_reminders` и `process_due_reminders`, независимое управление каналами email/in_app, токен служебного эндпоинта).

### Добавлено — фронтенд

- `store/api/tasksApi.ts` (новый RTK Query срез), `store/api/notificationsApi.ts` дополнен пагинацией (infinite-scroll через `serializeQueryArgs`/`merge`) и предпочтениями.
- `components/tasks/TaskModal.tsx` (создание/редактирование задачи с пресетами напоминания), `components/tasks/MyTasksList.tsx` (Просрочено/Сегодня/Предстоящие).
- `pages/Calendar.tsx` — из read-only в полноценный CRUD (`@fullcalendar/interaction`: клик по дню создаёт, drag-and-drop переносит, клик по событию редактирует; цвет по статусу/приоритету).
- Кнопка «Запланировать задачу/звонок» в `CustomerModal.tsx` (только для уже сохранённого клиента) и на `OrderDetailsPage.tsx`, с автоподстановкой `customer_id`/`order_id`.
- `pages/config/Notifications.tsx` — была статической заглушкой-роадмапом без единой живой строчки, заменена на таблицу переключателей email/in_app по типам.
- Колокольчик (`layout/AppHeader.tsx`) переведён на `GET /notifications/unread-count` вместо подсчёта на клиенте по неполному списку; `NotificationDropdown.tsx` — на пагинированный эндпоинт с «Показать ещё».
- Дата/время задач вводятся и показываются в часовом поясе Бишкека (`utils/dateUtils.ts::isoToDatetimeLocalValue`/`datetimeLocalValueToIso`, поверх уже существующих, но ранее нигде не использованных `utcToBishkek`/`bishkekToUtc`) — той же логике, что и остальной календарь/даты в проекте, а не локальному времени браузера.

### Найдено и исправлено попутно

- 🐛 Стейл `alembic_version` в dev-БД (`a1b2c3d4e5f6`, указывал на ревизию, удалённую при сквоше baseline 2026-08-30) — вручную выправлен на текущий head перед генерацией новой миграции.
- Автогенерация миграции попутно показала несвязанный дрифт схемы dev-БД (недостающие индексы на `orders`/`cash_flows`/`order_items`, несоответствие уникального ограничения `permissions.code`) — не относится к этой задаче, не включено в миграцию (см. комментарий в файле миграции).
