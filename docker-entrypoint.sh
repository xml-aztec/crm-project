#!/bin/sh
set -e

cd backend

# Схему БД поднимает ТОЛЬКО Alembic: приложение больше не вызывает create_all
# при старте (см. app/main.py). Ниже — один нормальный путь и две ветки
# совместимости для баз, заведённых до появления миграций в проекте.
#
# Различать их приходится по двум признакам: есть ли таблица alembic_version и
# есть ли вообще пользовательские таблицы.
has_version_table=$(python - <<'EOF'
import asyncio, os, asyncpg
url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
async def main():
    conn = await asyncpg.connect(url)
    try:
        version = await conn.fetchval("SELECT to_regclass('public.alembic_version')")
        tables = await conn.fetchval(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name <> 'alembic_version'")
        print("versioned" if version else ("legacy" if tables else "empty"))
    finally:
        await conn.close()
asyncio.run(main())
EOF
)

case "$has_version_table" in
  empty)
    # Честно пустая база: обычная накатка с нуля. Именно этот путь проходят
    # все новые окружения, и именно он раньше подменялся на create_all —
    # из-за чего миграции на свежем деплое не проверялись ни разу.
    alembic upgrade head
    ;;
  legacy)
    # Таблицы есть, alembic_version нет. Это база тех времён, когда схему
    # создавал create_all при старте приложения. Её схема соответствует
    # МОДЕЛЯМ, а не какой-то конкретной ревизии, поэтому проигрывать историю
    # нельзя (baseline упадёт на CREATE TABLE поверх существующих таблиц, а
    # послебазовые миграции — на уже созданных create_all таблицах вроде
    # notification_types). Достраиваем недостающее тем же create_all и
    # штампуем head.
    echo "База заведена до Alembic: достраиваем схему из моделей и штампуем head"
    python -c "import asyncio; from app.core.database import init_db; asyncio.run(init_db())"
    alembic stamp head
    ;;
  *)
    # alembic_version есть. Обычно достаточно upgrade; но если там лежит
    # ревизия, которой больше нет в alembic/versions (файлы удалены при
    # сквоше 2026-08-30), upgrade падает на её резолве. Тогда сбрасываем
    # версию через stamp --purge на известный baseline и доигрываем остальное.
    if ! alembic upgrade head; then
        echo "Неизвестная ревизия в alembic_version: штампуем baseline и доигрываем"
        alembic stamp 85a67bec609b --purge
        alembic upgrade head
    fi
    ;;
esac

# --proxy-headers: доверяем X-Forwarded-Proto от nginx (127.0.0.1), иначе
# uvicorn считает схему всегда http и ломает редиректы/куки за https-edge.
#
# --forwarded-allow-ips: строго 127.0.0.1 — nginx живёт в этом же контейнере и
# является единственным легитимным источником X-Forwarded-*. Раньше здесь было
# '*', то есть uvicorn доверял заголовку от кого угодно; slowapi определяет
# клиента через get_remote_address, поэтому атакующий, подставляя случайный
# X-Forwarded-For в каждый запрос, полностью обходил лимиты 5/мин на
# /auth/login и 3/мин на /auth/register и /auth/forgot-password.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='127.0.0.1' &

# Railway задаёт $PORT динамически при каждом деплое — подставляем его в
# конфиг nginx перед стартом.
envsubst '${PORT}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf

# Запускаем nginx в фореграунде
exec nginx -g 'daemon off;'
