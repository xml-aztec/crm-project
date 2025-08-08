#!/bin/sh

# Активируем виртуальное окружение
. /venv/bin/activate

# Запускаем backend в фоне
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# Запускаем nginx в фореграунде
nginx -g 'daemon off;'