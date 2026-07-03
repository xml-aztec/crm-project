#!/bin/sh
set -e

cd backend

# Baseline-миграция пустая (схема создаётся через Base.metadata.create_all
# при старте приложения), но оставляем на случай появления реальных миграций.
alembic upgrade head

# Запускаем backend в фоне
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Railway задаёт $PORT динамически при каждом деплое — подставляем его в
# конфиг nginx перед стартом.
envsubst '${PORT}' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf

# Запускаем nginx в фореграунде
exec nginx -g 'daemon off;'
