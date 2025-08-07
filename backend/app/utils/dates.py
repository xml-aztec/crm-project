from datetime import datetime, date

def normalize_month_string(month: str) -> date:
    """Принимает 'YYYY-MM' или 'YYYY-MM-DD' и возвращает date (YYYY-MM-01)"""
    try:
        if len(month) == 7:
            return datetime.strptime(month, "%Y-%m").date()
        elif len(month) == 10:
            return datetime.strptime(month, "%Y-%m-%d").date().replace(day=1)
        else:
            raise ValueError("Неверный формат месяца")
    except Exception:
        raise ValueError("Неверный формат даты. Используйте 'YYYY-MM' или 'YYYY-MM-DD'")