from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db
from app.schemas.product_stock import ProductStockOut, ProductStockCreate, ProductStockUpdate
from app.repositories import product_stock as repo

router = APIRouter(prefix="/stock", tags=["Product Stock"])

@router.post("/", response_model=ProductStockOut)
async def create_stock(data: ProductStockCreate, db: AsyncSession = Depends(get_db)):
    return await repo.upsert(db, data)

@router.get("/", response_model=List[ProductStockOut])
async def get_stock_list(
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await repo.filter(db, product_id=product_id, warehouse_id=warehouse_id)

@router.get("/{stock_id}", response_model=ProductStockOut)
async def get_stock_by_id(stock_id: int, db: AsyncSession = Depends(get_db)):
    stock = await db.get(repo.ProductStock, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.patch("/{stock_id}", response_model=ProductStockOut)
async def update_stock(stock_id: int, data: ProductStockUpdate, db: AsyncSession = Depends(get_db)):
    updated = await repo.update(db, stock_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Stock not found")
    return updated

@router.delete("/{stock_id}", response_model=dict)
async def delete_stock(stock_id: int, db: AsyncSession = Depends(get_db)):
    success = await repo.delete(db, stock_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {"message": "Stock deleted"}