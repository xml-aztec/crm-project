#!/bin/sh
set -e

cd backend

# С 2026-08-30 baseline-миграция реальная (создаёт всю схему с нуля), так что
# `alembic upgrade head` теперь отрабатывает и на честно пустой БД сам по себе.
# Но БД, поднятые до этого фикса, всё ещё существуют: их таблицы созданы через
# Base.metadata.create_all при старте приложения, а alembic_version никогда не
# проставлялся — с точки зрения `alembic current` такая БД неотличима от
# честно пустой, а baseline попытается CREATE TABLE поверх уже существующих
# таблиц и упадёт. Поэтому на "чистой" по alembic БД сначала прогоняем
# create_all (идемпотентно — создаёт только то, чего ещё нет) и штампуем head,
# вместо того чтобы проигрывать историю миграций.
if [ -z "$(alembic current 2>/dev/null)" ]; then
    python -c "import asyncio; from app.core.database import init_db; asyncio.run(init_db())"
    alembic stamp head
else
    # БД, которая уже проходила через СТАРУЮ (до сквоша 2026-08-30) цепочку
    # миграций, хранит в alembic_version ревизию, которой больше нет в
    # alembic/versions/ (файлы удалены при сквоше) — `alembic current` в
    # этом случае не возвращает пусто (печатает "FAILED: Can't locate
    # revision..." прямо в stdout), так что верхняя проверка её не ловит, и
    # `alembic upgrade head` падает сразу с той же ошибкой. Восстанавливаемся:
    # штампуем известный текущий baseline с --purge (сбрасывает alembic_version
    # без попытки резолвить старую/битую ревизию — таблицы baseline на этой БД
    # уже есть) и затем даём alembic реально накатить всё, что появилось после
    # baseline, обычным DDL — а не через create_all, который не умеет
    # добавлять новые колонки (например, notifications.read_at) на уже
    # существующие таблицы.
    if ! alembic upgrade head; then
        alembic stamp 85a67bec609b --purge
        alembic upgrade head
    fi
fi

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
