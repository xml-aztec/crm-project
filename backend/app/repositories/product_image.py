import uuid
from typing import Optional

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.product_image import ProductImage
from app.utils import storage
from app.utils.image_processing import (
    generate_full_webp,
    generate_thumbnail_webp,
    validate_and_open_image,
)

STAGING_PREFIX_TEMPLATE = "products/{product_id}/staging/"


async def _get_product_or_404(db: AsyncSession, product_id: int) -> Product:
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product


async def get_images_for_product(db: AsyncSession, product_id: int) -> list[ProductImage]:
    result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id).order_by(ProductImage.position)
    )
    return list(result.scalars().all())


async def create_presigned_upload(
    db: AsyncSession, product_id: int, filename: str, content_type: str, file_size: int
) -> dict:
    await _get_product_or_404(db, product_id)

    if content_type not in storage.ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Допустимые форматы изображений: JPG, PNG, WebP")
    if file_size > storage.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Максимальный размер файла — 5 МБ")

    ext = storage.ALLOWED_CONTENT_TYPES[content_type]
    image_uuid = uuid.uuid4().hex
    key = f"{STAGING_PREFIX_TEMPLATE.format(product_id=product_id)}{image_uuid}.{ext}"
    upload_url = storage.generate_presigned_put_url(key, content_type)
    return {"upload_url": upload_url, "key": key}


async def confirm_upload(db: AsyncSession, product_id: int, key: str) -> ProductImage:
    await _get_product_or_404(db, product_id)

    expected_prefix = STAGING_PREFIX_TEMPLATE.format(product_id=product_id)
    if not key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="Некорректный ключ загрузки")

    image_uuid = key[len(expected_prefix):].rsplit(".", 1)[0]

    try:
        data = await storage.download_object(key)
    except Exception:
        raise HTTPException(status_code=400, detail="Загруженный файл не найден — возможно, ссылка истекла")

    # Проверка объявленного размера на этапе presign не гарантирует, что
    # клиент не залил больше напрямую в R2 — перепроверяем реальный размер.
    if len(data) > storage.MAX_UPLOAD_SIZE:
        await storage.delete_object(key)
        raise HTTPException(status_code=400, detail="Максимальный размер файла — 5 МБ")

    try:
        img = await run_in_threadpool(validate_and_open_image, data)
    except HTTPException:
        await storage.delete_object(key)
        raise

    thumb_bytes = await run_in_threadpool(generate_thumbnail_webp, img)
    full_bytes = await run_in_threadpool(generate_full_webp, img)

    thumb_key = f"products/{product_id}/{image_uuid}-thumb.webp"
    full_key = f"products/{product_id}/{image_uuid}-full.webp"
    await storage.upload_object(thumb_key, thumb_bytes, "image/webp")
    await storage.upload_object(full_key, full_bytes, "image/webp")
    await storage.delete_object(key)

    max_position = await db.scalar(
        select(func.coalesce(func.max(ProductImage.position), -1)).where(ProductImage.product_id == product_id)
    )
    existing_count = await db.scalar(
        select(func.count()).select_from(ProductImage).where(ProductImage.product_id == product_id)
    )

    image = ProductImage(
        product_id=product_id,
        thumbnail_url=storage.public_url_for_key(thumb_key),
        full_url=storage.public_url_for_key(full_key),
        position=max_position + 1,
        is_primary=(existing_count == 0),
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


async def reorder_images(db: AsyncSession, product_id: int, image_ids: list[int]) -> list[ProductImage]:
    images = {img.id: img for img in await get_images_for_product(db, product_id)}
    if set(image_ids) != set(images.keys()):
        raise HTTPException(status_code=400, detail="Список изображений не совпадает с изображениями товара")

    for position, image_id in enumerate(image_ids):
        images[image_id].position = position

    await _ensure_primary_invariant(db, product_id)
    await db.commit()
    return await get_images_for_product(db, product_id)


async def set_primary(db: AsyncSession, product_id: int, image_id: int) -> list[ProductImage]:
    images = await get_images_for_product(db, product_id)
    if image_id not in {img.id for img in images}:
        raise HTTPException(status_code=404, detail="Изображение не найдено")

    for img in images:
        img.is_primary = img.id == image_id

    await db.commit()
    return await get_images_for_product(db, product_id)


async def delete_image(db: AsyncSession, product_id: int, image_id: int) -> None:
    result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")

    keys = [
        key
        for key in (storage.key_from_public_url(image.thumbnail_url), storage.key_from_public_url(image.full_url))
        if key
    ]
    await storage.delete_objects(keys)

    await db.delete(image)
    await _ensure_primary_invariant(db, product_id)
    await db.commit()


async def _ensure_primary_invariant(db: AsyncSession, product_id: int) -> None:
    """Гарантирует, что если у товара есть хотя бы одно изображение, ровно
    одно из них помечено is_primary — на случай гонки при параллельном
    удалении/изменении порядка. Главным становится первое по позиции."""
    images = await get_images_for_product(db, product_id)
    if images and not any(img.is_primary for img in images):
        images[0].is_primary = True
