from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

THUMBNAIL_SIZE = (300, 300)
FULL_SIZE = (1200, 1200)
THUMBNAIL_QUALITY = 80
FULL_QUALITY = 85


def validate_and_open_image(data: bytes) -> Image.Image:
    """Проверяет, что data — действительно валидное изображение (а не файл с
    обманным расширением/MIME-типом), а не просто доверяет заголовкам запроса.
    Image.verify() — стандартная проверка Pillow, которая падает на файлах,
    не являющихся настоящими изображениями, даже если они успешно прошли
    проверку типа/размера на этапе выдачи presigned URL."""
    try:
        img = Image.open(BytesIO(data))
        img.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Файл повреждён или не является изображением")

    # verify() закрывает файл для дальнейшего использования — открываем заново.
    try:
        img = Image.open(BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Файл повреждён или не является изображением")

    return img


def _normalize_mode(image: Image.Image) -> Image.Image:
    if image.mode == "P":
        return image.convert("RGBA")
    if image.mode not in ("RGB", "RGBA"):
        return image.convert("RGB")
    return image


def _to_webp_bytes(img: Image.Image, size: tuple[int, int], quality: int) -> bytes:
    image = ImageOps.exif_transpose(img.copy()) or img.copy()
    image = _normalize_mode(image)
    image.thumbnail(size, Image.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=quality)
    buffer.seek(0)
    return buffer.getvalue()


def generate_thumbnail_webp(img: Image.Image) -> bytes:
    return _to_webp_bytes(img, THUMBNAIL_SIZE, THUMBNAIL_QUALITY)


def generate_full_webp(img: Image.Image) -> bytes:
    return _to_webp_bytes(img, FULL_SIZE, FULL_QUALITY)
