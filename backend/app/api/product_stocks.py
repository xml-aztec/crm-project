from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Literal, Optional

from app.core.dependencies import get_current_user, get_db
from app.rbac.dependencies import require_permission
from app.schemas.product_stock import ProductStockOut, ProductStockCreate, ProductStockUpdate, StockListResponse
from app.repositories import product_stock as repo
from app.schemas.stock_log import StockLogCreate
from app.repositories.stock_log import create_stock_log

router = APIRouter(prefix="/stock", tags=["Product Stock"])

@router.post(
    "/",
    response_model=ProductStockOut,
    summary="Создание или обновление остатка",
    description="Добавляет новый остаток или обновляет существующий по паре (product_id, warehouse_id).",
    dependencies=[Depends(get_current_user)]
)
async def create_stock(
    data: ProductStockCreate,
    db: AsyncSession = Depends(get_db)
) -> ProductStockOut:
    result = await repo.upsert(db, data)
    await create_stock_log(db, StockLogCreate(
        product_id=data.product_id,
        warehouse_id=data.warehouse_id,
        quantity=data.quantity,
        type="incoming",
        note="Ручное добавление остатка"
    ))
    return result

@router.get(
    "/",
    response_model=StockListResponse,
    summary="Список остатков с фильтрацией и статистикой",
    description="Возвращает список остатков товаров с возможностью фильтрации по товару, складу, уровню запасов, SKU, штрихкоду и названию.",
    dependencies=[Depends(get_current_user), Depends(require_permission("stock.read"))]
)
async def get_stock_list(
    product_id: Optional[int] = Query(None, description="Фильтрация по ID товара"),
    warehouse_id: Optional[int] = Query(None, description="Фильтрация по ID склада"),
    sku: Optional[str] = Query(None, description="Поиск по SKU товара"),
    barcode: Optional[str] = Query(None, description="Поиск по штрихкоду товара"),
    name: Optional[str] = Query(None, description="Поиск по названию товара"),
    stock_level: Optional[Literal["all", "in_stock", "low_stock", "out_of_stock"]] = Query("all", description="Фильтрация по уровню запасов"),
    skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
    limit: int = Query(100, ge=1, le=500, description="Сколько записей вернуть"),
    db: AsyncSession = Depends(get_db),
) -> StockListResponse:
    stocks, stats = await repo.get_filtered_with_stats(
        db=db,
        product_id=product_id,
        warehouse_id=warehouse_id,
        sku=sku,
        barcode=barcode,
        name=name,
        stock_level=stock_level,
        skip=skip,
        limit=limit
    )
    return StockListResponse(stocks=stocks, stats=stats)

@router.get(
    "/{stock_id}",
    response_model=ProductStockOut,
    summary="Получить остаток по ID",
    description="Возвращает запись об остатке товара по его ID в таблице product_stock.",
    dependencies=[Depends(get_current_user)]
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
    description="Изменяет количество товара на складе. Можно изменить только поле quantity.",
    dependencies=[Depends(get_current_user)]
)
async def update_stock(
    stock_id: int,
    data: ProductStockUpdate,
    db: AsyncSession = Depends(get_db)
) -> ProductStockOut:
    updated = await repo.update(db, stock_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Stock not found")
    if data.quantity is not None:
        await create_stock_log(db, StockLogCreate(
            product_id=updated.product_id,
            warehouse_id=updated.warehouse_id,
            quantity=data.quantity,
            type="adjust",
            note="Ручная корректировка остатка"
        ))
    return updated

@router.delete(
    "/{stock_id}",
    response_model=dict,
    summary="Удаление остатка",
    description="Удаляет запись об остатке товара по ID. Возвращает сообщение об успешном удалении.",
    dependencies=[Depends(get_current_user)]
)
async def delete_stock(
    stock_id: int,
    db: AsyncSession = Depends(get_db)
) -> dict:
    success = await repo.delete(db, stock_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {"message": "Stock deleted"}