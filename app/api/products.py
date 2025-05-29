from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import product as repo
from app.schemas.product import ProductCreate, ProductRead

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/", response_model=list[ProductRead])
async def list_products(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

@router.post("/", response_model=ProductRead)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, product_data=data.dict())

@router.delete("/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await repo.delete(db, product_id)
    return {"detail": "Product deleted"}