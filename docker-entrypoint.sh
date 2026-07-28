#!/bin/sh
set -e

cd backend

# Baseline-миграция пустая — все таблицы исторически создавались через
# Base.metadata.create_all при старте приложения, а последующие миграции
# (add column и т.п.) написаны в предположении, что эти таблицы уже
# существуют. На чистой БД (например, свежая Postgres на Render) это
# уронит `alembic upgrade head` на первой же такой миграции. Поэтому на
# чистой БД (нет ни одной применённой ревизии) сначала создаём схему через
# create_all и штампуем head, а не проигрываем историю миграций.
if [ -z "$(alembic current 2>/dev/null)" ]; then
    python -c "import asyncio; from app.core.database import init_db; asyncio.run(init_db())"
    alembic stamp head
else
    alembic upgrade head
fi

# --proxy-headers: доверяем X-Forwarded-Proto от nginx (127.0.0.1), иначе
# uvicorn считает схему всегда http и ломает редиректы/куки за https-edge.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*' &

# Railway задаёт $PORT динамически при каждом деплое — подставляем его в
# конфиг nginx перед стартом.
envsubst '${PORT}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf

# Запускаем nginx в фореграунде
exec nginx -g 'daemon off;'
