from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.product import Product

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
    return result.scalar_one_or_none()

async def create(db: AsyncSession, product_data: dict) -> Product:
    product = Product(**product_data)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

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