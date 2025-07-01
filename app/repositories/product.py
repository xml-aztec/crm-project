from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.product import Product
from app.schemas.product import ProductCreate
from fastapi import HTTPException

from app.utils.barcode_utils import generate_qr_base64, validate_ean13
from datetime import datetime
import random

def generate_sku() -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = f"{random.randint(10000, 99999)}"
    return f"PRD-{date_part}-{random_part}"

async def is_sku_exists(db: AsyncSession, sku: str) -> bool:
    result = await db.execute(select(Product).where(Product.sku == sku))
    return result.scalar_one_or_none() is not None

async def get_all(db: AsyncSession) -> list[Product]:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.subcategory),
            selectinload(Product.brand)
        )
        .order_by(Product.name)
    )
    return result.scalars().all()

async def get_by_id(db: AsyncSession, product_id: int) -> Product | None:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.subcategory),
            selectinload(Product.brand)
        )
    )
    product = result.scalar_one_or_none()
    if product:
        product.qr_code = generate_qr_base64(product.sku or str(product.id))
    return product

async def create(db: AsyncSession, data: ProductCreate):
    if data.barcode and not validate_ean13(data.barcode):
        raise HTTPException(status_code=400, detail="Невалидный EAN‑13 штрихкод")

    data_dict = data.model_dump()

    # Генерация уникального SKU, если не передан
    if not data_dict.get("sku"):
        sku = generate_sku()
        while await is_sku_exists(db, sku):
            sku = generate_sku()
        data_dict["sku"] = sku

    new_product = Product(**data_dict)
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    return new_product

async def update(db: AsyncSession, product_id: int, data: dict):
    query = await db.execute(select(Product).where(Product.id == product_id))
    product = query.scalar_one_or_none()
    if not product:
        return None

    if data.get("barcode") and not validate_ean13(data["barcode"]):
        raise HTTPException(status_code=400, detail="Невалидный EAN‑13 штрихкод")

    for field, value in data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product

async def delete(db: AsyncSession, product_id: int):
    product = await get_by_id(db, product_id)
    if product:
        await db.delete(product)
        await db.commit()