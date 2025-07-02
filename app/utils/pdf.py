import pdfkit
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import qrcode
from io import BytesIO
import base64

from app.schemas.supply import SupplyOut
from app.core.config import settings

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


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

    total_cost = sum(
        (item["cost_price"] or 0) * item["quantity"]
        for item in supply_data["items"]
    )

    qr_url = f"{settings.BASE_URL}/supplies/{supply.id}"
    qr_code = generate_qr_base64(qr_url)

    template = env.get_template("supply_invoice.html")
    html_content = template.render(
        supply=supply_data,
        total_cost=total_cost,
        qr_code=qr_code,
        qr_url=qr_url
    )

    options = {
        'page-size': 'A4',
        'encoding': 'UTF-8',
        'quiet': '',
    }

    pdf_bytes = pdfkit.from_string(html_content, False, options=options)
    return pdf_bytes