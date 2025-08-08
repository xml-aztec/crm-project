# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json frontend/tsconfig.json ./frontend/
COPY frontend/ ./frontend/

WORKDIR /app/frontend

RUN npm ci
RUN npm run build

# Stage 2: Build backend
FROM python:3.12-slim AS backend-build

WORKDIR /app/backend

COPY backend/pyproject.toml backend/poetry.lock ./
COPY backend/README.md ./backend/README.md

# Устанавливаем poetry и зависимости без создания виртуального окружения
RUN pip install poetry \
    && poetry config virtualenvs.create false \
    && poetry install --without dev --no-root

COPY backend/ ./backend

# Stage 3: Final image with Nginx + backend + frontend
FROM nginx:stable-alpine

# Устанавливаем python и необходимые системные зависимости
RUN apk add --no-cache python3 py3-pip bash

# Создаём виртуальное окружение
RUN python3 -m venv /venv

# Активируем виртуальное окружение и обновляем pip, устанавливаем нужные пакеты
RUN /venv/bin/pip install --upgrade pip \
    && /venv/bin/pip install uvicorn[standard] asyncpg sqlalchemy

WORKDIR /app/backend

# Копируем фронтенд в nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Копируем backend из билд-стадии
COPY --from=backend-build /app/backend /app/backend

# Копируем скрипт запуска
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80 8000

# В скрипте запуска нужно активировать виртуальное окружение и запускать uvicorn из него
CMD ["docker-entrypoint.sh"]