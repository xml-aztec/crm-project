import csv
import io
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, exists, select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.product import Product
from app.models.product_stock import ProductStock
from app.schemas.product import ProductCreate
from app.utils.barcode_utils import generate_qr_base64, validate_ean13, generate_sku


async def get_filtered(
    db: AsyncSession,
    name: Optional[str] = None,
    sku: Optional[str] = None,
    barcode: Optional[str] = None,
    brand_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    available_quantity_min: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_cost_price: Optional[float] = None,
    max_cost_price: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Product]:
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.subcategory),
        selectinload(Product.brand),
    )

    filters = []

    if name:
        filters.append(Product.name.ilike(f"%{name}%"))
    if sku:
        filters.append(Product.sku.ilike(f"%{sku}%"))
    if barcode:
        filters.append(Product.barcode.ilike(f"%{barcode}%"))
    if brand_id:
        filters.append(Product.brand_id == brand_id)
    if category_id:
        filters.append(Product.category_id == category_id)
    if subcategory_id:
        filters.append(Product.subcategory_id == subcategory_id)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if min_cost_price is not None:
        filters.append(Product.cost_price >= min_cost_price)
    if max_cost_price is not None:
        filters.append(Product.cost_price <= max_cost_price)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.order_by(Product.name))
    products = result.scalars().all()

    filtered_products = []
    for product in products:
        stock_query = await db.execute(
            select(func.coalesce(func.sum(ProductStock.quantity), 0))
            .where(ProductStock.product_id == product.id)
        )
        available_quantity = stock_query.scalar()
        product.available_quantity = available_quantity
        product.qr_code = generate_qr_base64(product.sku or str(product.id))

        if available_quantity_min is not None and available_quantity < available_quantity_min:
            continue

        filtered_products.append(product)

    return filtered_products[skip : skip + limit]


async def get_by_id(db: AsyncSession, product_id: int) -> Optional[Product]:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.subcategory),
            selectinload(Product.brand),
        )
    )
    product = result.scalar_one_or_none()
    if product:
        product.qr_code = generate_qr_base64(product.sku or str(product.id))

        stock_query = await db.execute(
            select(func.coalesce(func.sum(ProductStock.quantity), 0))
            .where(ProductStock.product_id == product.id)
        )
        product.available_quantity = stock_query.scalar()

    return product

async def create(db: AsyncSession, data: ProductCreate):
    if data.barcode and not validate_ean13(data.barcode):
        raise HTTPException(status_code=400, detail="Невалидный EAN‑13 штрихкод")

    sku = data.sku or generate_sku()

    exists_query = await db.execute(
        select(exists().where(Product.sku == sku))
    )
    if exists_query.scalar():
        raise HTTPException(status_code=400, detail="Такой SKU уже существует")

    new_product = Product(**data.model_dump())
    new_product.sku = sku

    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    return new_product

async def update(db: AsyncSession, product_id: int, data: dict):
    query = await db.execute(select(Product).where(Product.id == product_id))
    product = query.scalar_one_or_none()
    if not product:
        return None

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


async def get_all_for_export(db: AsyncSession) -> list[Product]:
    result = await db.execute(select(Product).order_by(Product.name))
    return result.scalars().all()


async def import_from_csv(db: AsyncSession, content: bytes) -> dict:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    created = updated = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        try:
            name = (row.get("name") or "").strip()
            if not name:
                errors.append(f"Строка {i}: пустое поле name")
                continue

            def _float(v: str) -> float:
                try:
                    return float(v) if v and v.strip() else 0.0
                except ValueError:
                    return 0.0

            def _int(v: str):
                s = (v or "").strip()
                return int(s) if s else None

            sku = (row.get("sku") or "").strip() or None
            cost_price = _float(row.get("cost_price", ""))
            price = _float(row.get("price", ""))
            barcode = (row.get("barcode") or "").strip() or None
            description = (row.get("description") or "").strip() or None
            detail = (row.get("detail") or "").strip() or None
            category_id = _int(row.get("category_id", ""))
            subcategory_id = _int(row.get("subcategory_id", ""))
            brand_id = _int(row.get("brand_id", ""))

            existing = None
            if sku:
                res = await db.execute(select(Product).where(Product.sku == sku))
                existing = res.scalar_one_or_none()

            if existing:
                existing.name = name
                existing.cost_price = cost_price
                existing.price = price
                existing.description = description
                existing.detail = detail
                existing.barcode = barcode
                existing.category_id = category_id
                existing.subcategory_id = subcategory_id
                existing.brand_id = brand_id
                updated += 1
            else:
                new_sku = sku or generate_sku()
                db.add(Product(
                    name=name, cost_price=cost_price, price=price,
                    sku=new_sku, barcode=barcode, description=description,
                    detail=detail, category_id=category_id,
                    subcategory_id=subcategory_id, brand_id=brand_id,
                ))
                created += 1
        except Exception as exc:
            errors.append(f"Строка {i}: {exc}")

    await db.commit()
    return {"created": created, "updated": updated, "errors": errors}