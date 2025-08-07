import re
from datetime import datetime
from fastapi import HTTPException

def validate_month_format(month: str) -> str:
    """
    Проверяет, что строка имеет формат YYYY-MM и возвращает её в формате YYYY-MM-01.
    """
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise HTTPException(
            status_code=422,
            detail="Неверный формат месяца. Используйте формат 'YYYY-MM', например '2025-06'."
        )

    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Указан недопустимый месяц. Убедитесь, что месяц от 01 до 12."
        )

    return f"{month}-01"