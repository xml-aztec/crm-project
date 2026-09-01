import re
import qrcode
import base64
import random
from io import BytesIO
from datetime import datetime

# Цифровые штрихкоды этих длин несут контрольную цифру GS1, проверяемую общим
# алгоритмом: EAN-8, UPC-A, EAN-13, ITF-14/GTIN-14.
_GS1_CHECKSUM_LENGTHS = {8, 12, 13, 14}

# Code 39 и Codabar кроме цифр могут содержать буквы и служебные символы.
# Сама контрольная сумма для них уже проверена сканером при считывании —
# здесь важна только допустимая форма кода.
_BARCODE_CHARS_RE = re.compile(r"^[A-Za-z0-9\-.$/+% ]+$")


def _gs1_check_digit_valid(digits: str) -> bool:
    """Общий алгоритм GS1 (вес 3/1, считается справа налево) — единый для
    EAN-8, UPC-A, EAN-13 и ITF-14/GTIN-14."""
    body, check_digit = digits[:-1], int(digits[-1])
    total = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(body)))
    return (10 - total % 10) % 10 == check_digit


def validate_barcode(barcode: str) -> bool:
    """
    Принимает штрихкоды всех форматов, которые умеет распознавать сканер
    (EAN-13, EAN-8, UPC-A/E, Code128, Code39, Code93, Codabar, ITF):
    - для чисто цифровых кодов длиной 8/12/13/14 (EAN-8, UPC-A, EAN-13,
      ITF-14/GTIN-14) проверяется контрольная цифра по алгоритму GS1;
    - для остальных цифровых длин (например, UPC-E) и буквенно-цифровых
      кодов (Code128/Code39/Codabar) контрольная сумма не проверяется —
      достаточно допустимых символов и длины.
    """
    if not barcode:
        return False
    code = barcode.strip()
    if not (3 <= len(code) <= 48) or not _BARCODE_CHARS_RE.match(code):
        return False
    if code.isdigit() and len(code) in _GS1_CHECKSUM_LENGTHS:
        return _gs1_check_digit_valid(code)
    return True

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