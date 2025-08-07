import qrcode
import base64
import random
from io import BytesIO
from datetime import datetime

def validate_ean13(barcode: str) -> bool:
    if len(barcode) != 13 or not barcode.isdigit():
        return False

    digits = [int(d) for d in barcode]
    checksum = (sum(digits[i] if i % 2 == 0 else digits[i] * 3 for i in range(12)) % 10)
    control_digit = (10 - checksum) % 10
    return control_digit == digits[-1]

def generate_qr_base64(data: str) -> str:
    qr = qrcode.make(data)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def generate_qr_image(data: str) -> BytesIO:
    qr = qrcode.make(data)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer

def generate_sku() -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = f"{random.randint(10000, 99999)}"
    return f"PRD-{date_part}-{random_part}"