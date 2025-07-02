from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.dependencies import get_db
from app.schemas.product_stock import ProductStockOut, ProductStockCreate, ProductStockUpdate
from app.repositories import product_stock as repo

router = APIRouter(prefix="/stock", tags=["Product Stock"])

@router.post(
    "/",
    response_model=ProductStockOut,
    summary="Создание или обновление остатка",
    description="Добавляет новый остаток или обновляет существующий по паре (product_id, warehouse_id)."
)
async def create_stock(
    data: ProductStockCreate,
    db: AsyncSession = Depends(get_db)
) -> ProductStockOut:
    return await repo.upsert(db, data)

@router.get(
    "/",
    response_model=List[ProductStockOut],
    summary="Список остатков",
    description="Получить список остатков товаров с возможностью фильтрации по товару, складу и наличию (quantity > 0)."
)
async def get_stock_list(
    product_id: Optional[int] = Query(None, description="Фильтрация по ID товара"),
    warehouse_id: Optional[int] = Query(None, description="Фильтрация по ID склада"),
    in_stock_only: bool = Query(False, description="Показать только товары с положительным остатком"),
    db: AsyncSession = Depends(get_db),
) -> List[ProductStockOut]:
    return await repo.filter_stock(
        db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        in_stock_only=in_stock_only
    )

@router.get(
    "/{stock_id}",
    response_model=ProductStockOut,
    summary="Получить остаток по ID",
    description="Возвращает запись об остатке товара по его ID в таблице product_stock."
)
async def get_stock_by_id(
    stock_id: int,
    db: AsyncSession = Depends(get_db)
) -> ProductStockOut:
    stock = await db.get(repo.ProductStock, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock

@router.patch(
    "/{stock_id}",
    response_model=ProductStockOut,
    summary="Обновить остаток товара",
    description="Изменяет количество товара на складе. Можно изменить только поле quantity."
)
async def update_stock(
    stock_id: int,
    data: ProductStockUpdate,
    db: AsyncSession = Depends(get_db)
) -> ProductStockOut:
    updated = await repo.update(db, stock_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Stock not found")
    return updated

@router.delete(
    "/{stock_id}",
    response_model=dict,
    summary="Удаление остатка",
    description="Удаляет запись об остатке товара по ID. Возвращает сообщение об успешном удалении."
)
async def delete_stock(
    stock_id: int,
    db: AsyncSession = Depends(get_db)
) -> dict:
    success = await repo.delete(db, stock_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {"message": "Stock deleted"}