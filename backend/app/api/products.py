import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_db, is_admin
from app.models.user import User
from app.repositories import product as repo
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.utils.barcode_utils import generate_qr_image

router = APIRouter(prefix="/products", tags=["Products"])

@router.get(
    "/",
    response_model=list[ProductRead],
    summary="Список товаров с фильтрацией",
    description="Фильтрация по имени, SKU, штрихкоду, категориям, бренду, цене, наличию и себестоимости."
)
async def list_products(
    db: AsyncSession = Depends(get_db),
    name: Optional[str] = Query(None),
    sku: Optional[str] = Query(None),
    barcode: Optional[str] = Query(None),
    brand_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    subcategory_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_cost_price: Optional[float] = Query(None),
    max_cost_price: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await repo.get_filtered(
        db=db,
        name=name,
        sku=sku,
        barcode=barcode,
        brand_id=brand_id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        min_price=min_price,
        max_price=max_price,
        min_cost_price=min_cost_price,
        max_cost_price=max_cost_price,
        skip=skip,
        limit=limit,
    )

@router.get(
    "/export-csv",
    summary="Экспорт каталога в CSV",
    description="Скачивает все товары в формате CSV. Кодировка UTF-8 BOM для корректного открытия в Excel."
)
async def export_products_csv(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    products = await repo.get_all_for_export(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "description", "detail", "cost_price", "price", "sku", "barcode", "category_id", "subcategory_id", "brand_id"])
    for p in products:
        writer.writerow([
            p.id, p.name, p.description or "", p.detail or "",
            p.cost_price, p.price, p.sku or "", p.barcode or "",
            p.category_id or "", p.subcategory_id or "", p.brand_id or "",
        ])
    content = "﻿" + output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=products_export.csv"},
    )


@router.post(
    "/import-csv",
    summary="Импорт каталога из CSV",
    description="Загружает CSV-файл и массово создаёт/обновляет товары. Если SKU совпадает — обновляет запись, иначе создаёт новую. Только для администраторов."
)
async def import_products_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(is_admin),
):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Загрузите CSV-файл (.csv)")
    content = await file.read()
    return await repo.import_from_csv(db, content)


@router.get(
    "/{product_id}",
    response_model=ProductRead,
    summary="Получить товар по ID",
    description="Возвращает полную информацию о товаре, включая QR-код."
)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get(
    "/{product_id}/qr",
    summary="Получить QR-код товара (PNG)",
    description="Генерирует PNG-файл QR-кода на основе SKU или ID (для отображения)."
)
async def get_product_qr(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    img_io = generate_qr_image(product.sku or str(product.id))
    return StreamingResponse(img_io, media_type="image/png")

@router.get(
    "/{product_id}/qr/download",
    summary="Скачать QR-код товара (PNG)",
    description="Генерирует PNG-файл QR-кода с заголовком для скачивания файла."
)
async def download_product_qr(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    img_io = generate_qr_image(product.sku or str(product.id))
    filename = f"qr_{product.sku or product.id}.png"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }

    return StreamingResponse(img_io, media_type="image/png", headers=headers)

@router.post(
    "/",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать товар",
    description="Создаёт новый товар с заданными характеристиками."
)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data) 

@router.patch(
    "/{product_id}",
    response_model=ProductRead,
    summary="Обновить товар",
    description="Обновляет указанные поля товара: название, цену, бренд или подкатегорию."
)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    product = await repo.update(db, product_id, data.model_dump(exclude_unset=True))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    summary="Удалить товар",
    description="Удаляет товар по ID. Если товар не найден — возвращает ошибку 404."
)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await repo.delete(db, product_id)
    return {"detail": "Product deleted"}