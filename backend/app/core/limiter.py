import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Тесты гоняют десятки логинов через один и тот же клиент за секунды — лимит
# 5/минуту на /auth/login иначе бьёт по самим тестам, а не по реальным атакам.
# Продовый .env этот флаг не задаёт, так что там лимит всегда активен.
_disabled = os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true"

limiter = Limiter(key_func=get_remote_address, enabled=not _disabled)
