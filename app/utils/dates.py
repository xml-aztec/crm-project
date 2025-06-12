from datetime import datetime

def normalize_month_string(month: str) -> str:
    """Принимает 'YYYY-MM' или 'YYYY-MM-DD' и возвращает 'YYYY-MM-01'"""
    try:
        if len(month) == 7:  # 'YYYY-MM'
            return f"{month}-01"
        elif len(month) == 10:  # 'YYYY-MM-DD'
            return datetime.strptime(month, "%Y-%m-%d").strftime("%Y-%m-01")
        else:
            raise ValueError("Неверный формат месяца")
    except Exception:
        raise ValueError("Неверный формат даты. Используйте 'YYYY-MM' или 'YYYY-MM-DD'")