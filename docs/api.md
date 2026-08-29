# API — справочник эндпоинтов

Базовый URL за nginx — `/api/*` (префикс срезается перед проксированием на backend, см. [architecture.md](./architecture.md)). При прямом обращении к backend (локальная разработка) — без префикса `/api`. Автогенерируемая интерактивная документация FastAPI доступна на `/docs` (Swagger UI) и `/redoc` — Swagger UI не отключён (`docs_url` не переопределён в `main.py`).

Легенда прав доступа:

| Значок | Значение |
|---|---|
| 🌐 | публичный, без авторизации |
| 🔓 | любой авторизованный пользователь (`get_current_user`) — роль не проверяется |
| 🔑 `code` | гранулярное RBAC-право (`require_permission`) |
| 👑 | только администратор (`is_admin` → делегирует в RBAC-роль `Admin`) |
| 👤 | владелец записи или администратор (`is_order_owner_or_admin` / `is_self_or_admin`) |

Всего роутеров: 31. Всего эндпоинтов: ~155.

## Health

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/health` | 🌐 | Проверка живости + доступности БД |

## Auth (`/auth`)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| POST | `/auth/register` | 🌐 (3/мин) | Регистрация, роль всегда `manager`, требует одобрения админом |
| POST | `/auth/login` | 🌐 (5/мин) | Вход, ставит httpOnly JWT cookie на 1 час |
| POST | `/auth/logout` | 🌐 | Выход, удаляет cookie |
| POST | `/auth/forgot-password` | 🌐 (3/мин) | Отправка ссылки сброса пароля (ответ одинаков независимо от существования email) |
| POST | `/auth/reset-password` | 🌐 (5/мин) | Смена пароля по токену (токен одноразовый, 30 минут) |

## Users (`/users`)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/users/pending` | 👑 | Заявки, ожидающие одобрения |
| GET | `/users/` | 👑 | Список всех пользователей |
| GET | `/users/paginated` | 👑 | То же с пагинацией/поиском/фильтром по роли и статусу |
| GET | `/users/me` | 🔓 | Свой профиль. С 2026-08-29 включает `is_admin` (вычисляется через RBAC, `app.rbac.service.user_is_admin`) — источник, который теперь использует и фронтенд (`useRoleAccess`) |
| GET | `/users/me/stats` | 🔓 | Своя статистика по заказам |
| GET | `/users/me/permissions` | 🔓 | Свои RBAC-права (используется фронтом для `usePermissions`) |
| GET | `/users/{id}` | 👑 | Профиль пользователя |
| GET | `/users/{id}/stats` | 👤 | Статистика сотрудника (сам сотрудник или админ) |
| PATCH | `/users/{id}/admin` | 👑 | Изменение пользователя администратором |
| PATCH | `/users/me/password` | 🔓 | Смена собственного пароля |
| PATCH | `/users/me` | 🔓 | Обновление собственного профиля |
| DELETE | `/users/{id}` | 👑 | Удаление пользователя |
| PUT | `/users/{id}/approve` | 👑 | Одобрение заявки на регистрацию |
| DELETE | `/users/pending/{id}` | 👑 | Отклонение заявки на регистрацию |

## RBAC (`/rbac`) — весь роутер только для 👑 admin

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/rbac/permissions` | Каталог всех 37 прав (9 ресурсов × действия) |
| GET | `/rbac/roles` | Список ролей с их правами и числом пользователей |
| GET | `/rbac/roles/{id}` | Детали роли |
| POST | `/rbac/roles` | Создать кастомную роль с набором прав |
| PATCH | `/rbac/roles/{id}` | Переименовать / изменить набор прав (нельзя для системных ролей) |
| DELETE | `/rbac/roles/{id}` | Удалить кастомную роль (нельзя для системных) |
| GET | `/rbac/roles/{id}/users` | Пользователи с этой ролью |
| GET | `/rbac/users/{id}/roles` | Роли конкретного пользователя |
| POST | `/rbac/roles/{id}/assign` | Назначить роль пользователю |
| DELETE | `/rbac/roles/{id}/assign/{user_id}` | Снять роль с пользователя |

## Roles (legacy) (`/roles`)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/roles/` | 🔓 | Список легаси-ролей (admin/manager/staff) — используется при регистрации/сидинге, дублирует смысл RBAC-ролей |

## Каталог: Categories / Subcategories / Brands

Одинаковый паттерн во всех трёх: список и `/paginated` — 🔓, всё остальное — 👑.

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/categories/`, `/subcategories/`, `/brands/` | 🔓 | Полный список (без пагинации) |
| GET | `/categories/paginated`, `/subcategories/paginated`, `/brands/paginated` | 🔓 | Пагинация, поиск, фильтр по статусу/категории, сортировка |
| POST | `/categories/`, `/subcategories/`, `/brands/` | 👑 | Создание |
| PATCH | `/categories/{id}`, `/subcategories/{id}`, `/brands/{id}` | 👑 | Обновление |
| POST | `.../bulk-delete` | 👑 | Массовое удаление |
| POST | `.../bulk-status` | 👑 | Массовая смена `is_active` |
| DELETE | `.../{id}` | 👑 | Удаление |

## Products (`/products`)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/products/` | 🔓 + 🔑 `products.read` | Список с фильтрами (имя/SKU/штрихкод/бренд/категория/цена/остаток) |
| GET | `/products/export-csv` | 🔓 | Экспорт всего каталога в CSV (UTF-8 BOM) |
| POST | `/products/import-csv` | 👑 | Импорт CSV, upsert по SKU |
| GET | `/products/export-excel` | 🔓 | Экспорт в Excel с учётом фильтров |
| GET | `/products/import-template` | 👑 | Шаблон .xlsx для импорта |
| POST | `/products/import-excel/preview` | 👑 | Построчная валидация файла без сохранения |
| POST | `/products/import-excel` | 👑 | Импорт из Excel (создание/обновление пачками) |
| GET | `/products/scan/{code}` | 🔓 + 🔑 `products.read` | Поиск товара по коду сканера: SKU → штрихкод → ID (если код числовой) |
| GET | `/products/{id}` | 🔓 | Товар по ID с QR и остатком |
| GET | `/products/{id}/qr` | 🔓 | PNG QR-кода товара |
| GET | `/products/{id}/qr/download` | 🔓 | То же с заголовком на скачивание |
| POST | `/products/` | 🔑 `products.create` | Создание товара |
| PATCH | `/products/{id}` | 🔑 `products.update` | Обновление товара |
| DELETE | `/products/{id}` | 🔑 `products.delete` | Удаление товара |

## Customers / Customer Types

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/customers/`, `/customers/paginated` | 🔑 `customers.read` | Список / пагинация с поиском и фильтрами |
| GET | `/customers/{id}` | 🔓 | Клиент по ID |
| POST | `/customers/` | 🔑 `customers.create` | Создание |
| PATCH | `/customers/{id}` | 🔑 `customers.update` | Обновление |
| DELETE | `/customers/{id}` | 🔑 `customers.delete` | Удаление |
| GET | `/customer-types/` | 🔓 | Справочник типов клиентов |
| POST/PATCH/DELETE | `/customer-types/...` | 👑 | CRUD типов |

## Orders (`/orders`)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| POST | `/orders/` | 🔓 | Создание заказа (проверка склада/филиала для не-админов) |
| GET | `/orders/` | 🔓 + 🔑 `orders.read` | Список с фильтрами |
| GET | `/orders/{id}` | 🔓 | Заказ по ID (отменённый — виден только автору/админу) |
| PATCH | `/orders/{id}` | 👤 | Изменение способа оплаты/срока рассрочки — только автор или админ |
| PATCH | `/orders/{id}/confirm` | 👤 | Подтверждение — списывает товар со склада, проверяет остаток; только автор или админ |
| PATCH | `/orders/{id}/status` | 👤 | Смена статуса; отмена требует `cancellation_reason`; только автор или админ |
| GET | `/orders/{id}/history` | 🔓 | Таймлайн изменений (аудит) |
| GET | `/orders/{id}/stock-logs/` | 🔓 + 🔑 `stock.read` | Логи списания/возврата склада по этому заказу |
| DELETE | `/orders/{id}` | 🔑 `orders.delete` | Удаление заказа |
| POST | `/orders/{order_id}/items` | 👤 | Добавить позицию — только автор заказа или админ |
| PATCH | `/orders/{order_id}/items/{item_id}` | 👤 | Изменить позицию — только автор заказа или админ |
| DELETE | `/orders/{order_id}/items/{item_id}` | 👤 | Удалить позицию — только автор заказа или админ |
| GET | `/order-statuses/` | 🔓 | Справочник статусов |
| POST | `/order-statuses/` | 👑 | Добавить статус |

✅ **Исправлено 2026-08-29**: `confirm`/`status`/добавление-изменение-удаление позиций теперь проверяют владение заказом (`is_order_owner_or_admin`) — раньше требовали только авторизации. См. [CHANGELOG.md](../CHANGELOG.md).

## Склад: Warehouses / Product Stock / Stock Logs

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/warehouses/` | 🔑 `stock.read` | Список складов |
| GET | `/warehouses/{id}` | 🔓 | Склад по ID |
| POST/PATCH/DELETE | `/warehouses/...` | 👑 | CRUD складов |
| POST | `/stock/` | 🔑 `stock.create` | Создать/обновить остаток (upsert по товар+склад) |
| GET | `/stock/` | 🔑 `stock.read` | Список остатков с фильтрами и статистикой |
| GET | `/stock/{id}` | 🔓 | Остаток по ID |
| PATCH | `/stock/{id}` | 🔑 `stock.update` | Изменить количество |
| POST | `/stock/transfer` | 🔑 `stock.update` | Перемещение между складами (атомарно, с проверкой доступного остатка) |
| DELETE | `/stock/{id}` | 🔑 `stock.delete` | Удалить остаток |
| GET | `/stock/logs/`, `/stock/logs/paginated` | 🔑 `stock.read` | Журнал движений с фильтрами |

✅ **Исправлено 2026-08-29**: write-операции над `/stock/*` теперь требуют соответствующего RBAC-права (раньше — только авторизации). См. [CHANGELOG.md](../CHANGELOG.md).

## Suppliers / Supplies

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/suppliers/`, `/suppliers/paginated` | 🔑 `supplies.read` | Список поставщиков |
| GET | `/suppliers/{id}` | 🔓 | Поставщик по ID |
| POST/PATCH/DELETE | `/suppliers/...` | 👑 | CRUD |
| POST | `/supplies/` | 🔑 `supplies.create` | Создание поставки (начисляет товар на склад) |
| GET | `/supplies/` | 🔑 `supplies.read` | Список поставок с пагинацией |
| GET | `/supplies/{id}` | 🔓 | Поставка по ID |
| GET | `/supplies/{id}/pdf` | 🔓 | PDF-накладная с QR |
| PATCH | `/supplies/{id}` | 🔑 `supplies.update` | Изменение |
| DELETE | `/supplies/{id}` | 🔑 `supplies.delete` | Удаление |
| GET | `/analytics/supply/daily` | 👑 | Динамика поставок по дням |
| GET | `/analytics/supply/top-suppliers` | 👑 | Топ поставщиков за месяц |
| GET | `/analytics/supply/top-supplied-products` | 👑 | Топ поставленных товаров |

## Финансы: Cashflows / Budgets / Cash Gaps / Cashflow Meta

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/cash-flows/` | 🔑 `cashflow.read` | Список операций |
| GET/POST/PATCH/DELETE | `/budgets/...` | 👑 | Бюджеты по месяцам/категориям |
| GET/POST/PATCH/DELETE | `/cash-gap/...` | 👑 | Прогнозы кассовых разрывов |
| GET/POST/PATCH/DELETE | `/cashflow-meta/types/...`, `/cashflow-meta/categories/...` | 👑 | Справочники типов/категорий денежных потоков |

## Payroll / KPI / Monthly Targets

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/payrolls/` | 👑 | Список начислений |
| POST | `/payrolls/generate/` | 👑 | Генерация ведомости за месяц по KPI |
| POST | `/payrolls/{id}/pay` | 👑 | Отметить выплаченным |
| POST | `/payrolls/{id}/recalculate` | 👑 | Пересчитать по актуальному KPI |
| PATCH/DELETE | `/payrolls/{id}` | 👑 | Ручная правка/удаление |
| GET/POST/PATCH/DELETE | `/kpi-rules/...` | 👑 | Правила KPI (мин.% → бонус/штраф) |
| POST | `/monthly-targets/` | 👑 | Создать/обновить план менеджера на месяц |
| GET | `/monthly-targets/` | 👑 | Все планы |
| DELETE | `/monthly-targets/{id}` | 👑 | Удалить план |

## Analytics (`/analytics`) — все 👑, кроме отмеченных

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/analytics/kpi-summary` | 🔓 | KPI по заказам/клиентам за месяц |
| GET | `/analytics/sales-by-month` | 👑 | Продажи по месяцам |
| GET | `/analytics/daily`, `/analytics/daily-orders`, `/analytics/summary` | 🔓 | Базовые сводки (доход/заказы по дням, общая сводка) |
| GET | `/analytics/monthly-summary` | 🔓 | Сводка за текущий месяц |
| GET | `/analytics/orders-by-manager`, `/analytics/orders-by-status` | 🔓 | Доход по менеджерам / распределение по статусам |
| GET | `/analytics/recent-orders` | 👑 | Последние заказы |
| GET | `/analytics/order-status-summary` | 👑 | Сводка по статусам |
| GET | `/analytics/monthly-target-summary`, `/analytics/monthly-target/{manager_id}` | 👑 | KPI-план/факт |
| GET | `/analytics/leaderboard` | 👑 | Лидерборд менеджеров |
| GET | `/analytics/kpi/revenue-profit`, `/analytics/kpi/extended` | 👑 | Расширенная KPI-аналитика |
| GET | `/analytics/abc-analysis`, `/analytics/xyz-analysis` | 👑 | ABC/XYZ-анализ товаров |
| GET | `/analytics/pnl`, `/analytics/pnl/yearly` | 👑 | P&L-отчёт |
| GET | `/analytics/supply/top-products` | 👑 | Топ поставляемых товаров |

## Notifications (`/notifications`) — все 🔓, данные скоуплены на самого пользователя

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/notifications` | Мои уведомления |
| GET | `/notifications/unread-count` | Счётчик непрочитанных |
| PATCH | `/notifications/{id}/read` | Отметить прочитанным |
| PATCH | `/notifications/read-all` | Отметить все прочитанными |

## Справочники: Branches / Positions / Payment Methods

Одинаковый паттерн: список — 🔓, CRUD — 👑.

| Домен | Список | CRUD |
|---|---|---|
| `/branches/` | 🔓 (список и по ID) | 👑 |
| `/positions/` | 🔓 | 👑 |
| `/payment-methods/` | 🔓 | 👑 |

## Сводка по фактическому использованию RBAC-прав

**Обновлено 2026-08-29.** Изначально из 37 заведённых в `rbac/seed.py` прав в API реально проверялись только 6 (все — `*.read`). Теперь также проверяются `create`/`update`/`delete` на 5 доменах: `products.{create,update,delete}`, `customers.{create,update,delete}`, `stock.{create,update,delete}`, `orders.delete`, `supplies.{create,update,delete}` — итого 20 из 37 кодов реально влияют на доступ. Остальные права (весь `users.*`, `payroll.*`, `reports.*`, а также `orders.{create,update}`, `cashflow.*` кроме `read`) существуют в БД и доступны для назначения через `/rbac/roles`, но пока не подключены ни к одному эндпоинту — de facto не влияют на доступ (эти домены по-прежнему проверяются через грубый `is_admin`).
