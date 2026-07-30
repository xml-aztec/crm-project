# Stage 1: Build frontend
# tailwindcss v4 (@tailwindcss/oxide native binding) requires Node >= 20.
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json frontend/tsconfig.json ./
COPY frontend/ ./

# Фронтенд и бэкенд живут в одном контейнере за одним nginx, поэтому по
# умолчанию ходим на бэкенд через относительный /api (nginx проксирует
# /api/* на локальный uvicorn) — переопределяется build-arg при необходимости.
ARG VITE_API_URL=/api
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
# Debian-based (not Alpine) so we can copy backend-build's site-packages
# directly — Alpine/musl wheels are ABI-incompatible with Debian-built ones.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base wget ca-certificates \
    # wkhtmltopdf: бинарник, который шеллит наружу пакет pdfkit
    # (backend/app/utils/pdf.py) для генерации PDF накладных поставок.
    # Начиная с Debian bullseye пакет wkhtmltopdf убран из apt-репозиториев
    # (тянет патченный Qt WebKit, который Debian больше не поставляет) —
    # ставим официальный .deb с проекта напрямую; apt разрешает его рантайм-
    # зависимости (fontconfig, libjpeg62-turbo, libxrender1, ...) сам.
    && wget -q -O /tmp/wkhtmltox.deb \
        https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && (dpkg -i /tmp/wkhtmltox.deb || apt-get install -y -f) \
    && rm /tmp/wkhtmltox.deb \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

# Бэкенд-зависимости и консольные скрипты (alembic, uvicorn) из backend-build
COPY --from=backend-build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

WORKDIR /app/backend

# Копируем фронтенд в nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Шаблон конфига nginx — порт подставляется в entrypoint через envsubst,
# т.к. Railway задаёт $PORT динамически при каждом деплое.
COPY nginx/default.conf.template /etc/nginx/default.conf.template

# Копируем backend из билд-стадии
COPY --from=backend-build /app/backend /app/backend

# Копируем скрипт запуска и даём права
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=80
EXPOSE 80

CMD ["docker-entrypoint.sh"]
