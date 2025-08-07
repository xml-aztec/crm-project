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