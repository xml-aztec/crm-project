FROM python:3.12-slim

# Установка poetry
RUN pip install poetry

# Установка рабочей директории
WORKDIR /app

# Копируем все файлы сразу (включая app/) ДО установки зависимостей
COPY . .

# Указываем poetry, что не нужно создавать виртуальное окружение
RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi

# Команда по умолчанию
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]