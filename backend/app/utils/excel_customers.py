from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.worksheet import Worksheet

from app.models.customer import Customer

EXPORT_HEADERS = ["Имя", "Телефон", "Email", "Тип клиента", "Адрес", "Дата создания"]


def _autosize(ws: Worksheet, min_width: int = 10, max_width: int = 42) -> None:
    for col_cells in ws.columns:
        length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=min_width)
        letter = col_cells[0].column_letter
        ws.column_dimensions[letter].width = min(max(length + 2, min_width), max_width)


def build_export_workbook(customers: list[Customer]) -> BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Клиенты"
    ws.append(EXPORT_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for customer in customers:
        ws.append([
            customer.name or "",
            customer.phone or "",
            customer.email or "",
            customer.customer_type.name if customer.customer_type else "",
            customer.address or "",
            customer.created_at.strftime("%d.%m.%Y") if customer.created_at else "",
        ])

    _autosize(ws)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
