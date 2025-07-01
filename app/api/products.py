from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories import product as repo
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.utils.barcode_utils import generate_qr_image

router = APIRouter(prefix="/products", tags=["Products"])

@router.get(
    "/",
    response_model=list[ProductRead],
    summary="Список товаров",
    description="Возвращает список всех товаров с их параметрами (название, бренд, категория и т.д.)."
)
async def list_products(db: AsyncSession = Depends(get_db)):
    return await repo.get_all(db)

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