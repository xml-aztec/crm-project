import pdfkit
from datetime import date, datetime
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import qrcode
from io import BytesIO
import base64
from app.models.cashflow import CashFlow
from app.schemas.analytics import PnLReport
from app.schemas.supply import SupplyOut
from app.core.config import settings

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

PDF_OPTIONS = {
    'page-size': 'A4',
    'encoding': 'UTF-8',
    'quiet': '',
}

MONTH_NAMES_RU = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


def generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(box_size=4, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    base64_img = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{base64_img}"


def render_supply_pdf(supply: SupplyOut) -> bytes:
    supply_data = supply.model_dump()

    items_list = [
        item.model_dump() if hasattr(item, "model_dump") else item
        for item in getattr(supply, "items", [])
    ]
    supply_data["items"] = items_list

    total_cost = sum(
        (item.get("cost_price") or 0) * item.get("quantity", 0)
        for item in items_list
    )

    qr_url = f"{settings.BASE_URL}/supplies/{supply.id}"
    qr_code = generate_qr_base64(qr_url)

    supplier = supply_data.get("supplier", {})
    created_user = supply_data.get("created_user", {})

    template = env.get_template("supply_invoice.html")
    html_content = template.render(
        supply=supply_data,
        items=items_list,
        total_cost=total_cost,
        qr_code=qr_code,
        qr_url=qr_url,
        supplier_name=supplier.get("name", ""),
        supplier_contact_person=supplier.get("contact_person", ""),
        supplier_contact_info=supplier.get("contact_info", ""),
        supplier_address=supplier.get("address", ""),
        created_user_full_name=created_user.get("full_name", "")
    )

    options = {
        'page-size': 'A4',
        'encoding': 'UTF-8',
        'quiet': '',
    }

    pdf_bytes = pdfkit.from_string(html_content, False, options=options)
    return pdf_bytes


def render_pnl_pdf(report: PnLReport) -> bytes:
    """Тот же repo.get_pnl_report, что и экранный отчёт (app/api/analytics.py),
    так что PDF не может разойтись с тем, что видно на странице."""
    template = env.get_template("pnl_report.html")
    html_content = template.render(
        year=report.year,
        month=report.month,
        month_name=MONTH_NAMES_RU[report.month - 1],
        revenue=report.revenue,
        cogs=report.cogs,
        gross_profit=report.gross_profit,
        gross_margin_percent=report.gross_margin_percent,
        payroll_total=report.payroll_total,
        net_profit=report.net_profit,
        net_margin_percent=report.net_margin_percent,
        generated_at=datetime.now().strftime("%d.%m.%Y %H:%M"),
    )
    return pdfkit.from_string(html_content, False, options=PDF_OPTIONS)


def render_cashflow_pdf(
    entries: list[CashFlow],
    from_date: date | None,
    to_date: date | None,
    type_name: str | None,
) -> bytes:
    """Те же записи и та же арифметика итогов (доходы/расходы/баланс), что и
    на экране (frontend/src/pages/finance/Finance.tsx), чтобы PDF не мог
    разойтись с тем, что видно на странице."""
    total_income = sum(e.amount for e in entries if e.type.name == "income")
    total_expense = sum(e.amount for e in entries if e.type.name != "income")

    if from_date and to_date:
        period_label = f"{from_date.strftime('%d.%m.%Y')} — {to_date.strftime('%d.%m.%Y')}"
    elif from_date:
        period_label = f"с {from_date.strftime('%d.%m.%Y')}"
    elif to_date:
        period_label = f"по {to_date.strftime('%d.%m.%Y')}"
    else:
        period_label = "Весь период"
    if type_name:
        period_label += f" · {'Доходы' if type_name == 'income' else 'Расходы'}"

    template = env.get_template("cashflow_report.html")
    html_content = template.render(
        entries=entries,
        period_label=period_label,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        generated_at=datetime.now().strftime("%d.%m.%Y %H:%M"),
    )
    return pdfkit.from_string(html_content, False, options=PDF_OPTIONS)