from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.models.user import User
from app.rbac.dependencies import require_permission
from app.repositories import product_image as repo
from app.schemas.product_image import (
    ImageConfirmRequest,
    ImagePresignRequest,
    ImagePresignResponse,
    ImageReorderRequest,
    ProductImageOut,
)

router = APIRouter(prefix="/products/{product_id}/images", tags=["Product Images"])


@router.post(
    "/presign",
    response_model=ImagePresignResponse,
    summary="Получить presigned URL для загрузки изображения товара",
    description="Валидирует тип файла (jpg/png/webp) и заявленный размер (до 5 МБ) и возвращает "
                "временную ссылку для прямой загрузки в R2, минуя сервер приложения.",
)
async def presign_product_image(
    product_id: int,
    data: ImagePresignRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("products.update")),
):
    return await repo.create_presigned_upload(db, product_id, data.filename, data.content_type, data.file_size)


@router.post(
    "/confirm",
    response_model=ProductImageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Подтвердить завершение загрузки изображения",
    description="Скачивает загруженный файл, проверяет, что это действительно валидное изображение, "
                "генерирует thumbnail/full версии в WebP и сохраняет запись в БД.",
)
async def confirm_product_image(
    product_id: int,
    data: ImageConfirmRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("products.update")),
):
    return await repo.confirm_upload(db, product_id, data.key)


@router.patch(
    "/reorder",
    response_model=list[ProductImageOut],
    summary="Изменить порядок изображений товара",
)
async def reorder_product_images(
    product_id: int,
    data: ImageReorderRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("products.update")),
):
    return await repo.reorder_images(db, product_id, data.image_ids)


@router.patch(
    "/{image_id}/primary",
    response_model=list[ProductImageOut],
    summary="Назначить изображение главным",
)
async def set_primary_product_image(
    product_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("products.update")),
):
    return await repo.set_primary(db, product_id, image_id)


@router.delete(
    "/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить изображение товара",
    description="Удаляет сам объект (thumbnail и full) из R2, а не только запись в БД.",
)
async def delete_product_image(
    product_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("products.update")),
):
    await repo.delete_image(db, product_id, image_id)
