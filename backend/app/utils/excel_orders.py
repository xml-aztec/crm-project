from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.worksheet import Worksheet

EXPORT_HEADERS = [
    "№ заказа", "Дата", "Клиент", "Менеджер", "Статус", "Способ оплаты",
    "Товаров (шт.)", "Сумма", "Дата доставки", "Адрес доставки", "Филиал",
]


def _autosize(ws: Worksheet, min_width: int = 10, max_width: int = 42) -> None:
    for col_cells in ws.columns:
        length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=min_width)
        letter = col_cells[0].column_letter
        ws.column_dimensions[letter].width = min(max(length + 2, min_width), max_width)


def build_export_workbook(rows: list[dict]) -> BytesIO:
    """rows: список словарей от repositories/order.py::get_export_rows — одна
    строка на заказ (сводно, не по позициям)."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Заказы"
    ws.append(EXPORT_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for row in rows:
        ws.append([
            row.get("id"),
            row["created_at"].strftime("%d.%m.%Y %H:%M") if row.get("created_at") else "",
            row.get("customer_name") or "",
            row.get("manager_name") or "",
            row.get("status_name") or "",
            row.get("payment_method") or "",
            row.get("items_count") or 0,
            float(row["total_price"]) if row.get("total_price") is not None else 0,
            row["delivery_date"].strftime("%d.%m.%Y") if row.get("delivery_date") else "",
            row.get("delivery_address") or "",
            row.get("branch_name") or "",
        ])

    _autosize(ws)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
