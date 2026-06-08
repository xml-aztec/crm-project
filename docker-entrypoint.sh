#!/bin/sh

# Активируем виртуальное окружение
. /venv/bin/activate

cd backend

# Применяем миграции перед стартом
alembic upgrade head

# Запускаем backend в фоне
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Запускаем nginx в фореграунде
nginx -g 'daemon off;'