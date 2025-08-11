# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json frontend/tsconfig.json ./
COPY frontend/ ./

# Передаём переменную окружения VITE_API_URL через build-arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm ci
RUN npm run build

# Stage 2: Build backend
FROM python:3.12-slim AS backend-build

WORKDIR /app/backend

COPY backend/pyproject.toml backend/poetry.lock ./
COPY backend/README.md ./backend/README.md

RUN pip install poetry \
    && poetry config virtualenvs.create false \
    && poetry install --without dev --no-root

COPY backend/ ./backend

# Stage 3: Final image with Nginx + backend + frontend
FROM nginx:stable-alpine

# Устанавливаем python и необходимые системные зависимости
RUN apk add --no-cache python3 py3-pip bash

# Создаём виртуальное окружение и активируем его
RUN python3 -m venv /venv

RUN /venv/bin/pip install --upgrade pip \
    && /venv/bin/pip install uvicorn[standard] asyncpg sqlalchemy

WORKDIR /app/backend

# Копируем фронтенд в nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Копируем backend из билд-стадии
COPY --from=backend-build /app/backend /app/backend

# Копируем скрипт запуска и даём права
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80 8000

CMD ["docker-entrypoint.sh"]