import pdfkit
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from app.schemas.supply import SupplyOut

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

def render_supply_pdf(supply: SupplyOut) -> bytes:
    supply_data = supply.dict()

    total_cost = sum(
        (item.get("cost_price") or 0) * item.get("quantity", 0)
        for item in supply_data.get("items", [])
    )

    template = env.get_template("supply_invoice.html")
    html_content = template.render(supply=supply_data, total_cost=total_cost)

    options = {
        'page-size': 'A4',
        'encoding': 'UTF-8',
        'quiet': '',
    }

    pdf_bytes = pdfkit.from_string(html_content, False, options=options)
    return pdf_bytes