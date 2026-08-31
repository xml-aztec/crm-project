from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Literal, Optional

from app.core.dependencies import get_current_user, get_db
from app.rbac.dependencies import require_permission
from app.repositories import customer as repo
from app.schemas.customer import CustomerCreate, CustomerPage, CustomerRead, CustomerUpdate
from app.utils.excel_customers import build_export_workbook

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get(
    "/",
    response_model=List[CustomerRead],
    dependencies=[Depends(get_current_user), Depends(require_permission("customers.read"))],
    summary="Список клиентов",
    description="Возвращает список всех клиентов с их данными: имя, телефон, email, адрес и тип клиента."
)
async def list_customers(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await repo.get_all(db, skip=skip, limit=limit)

@router.get(
    "/paginated",
    response_model=CustomerPage,
    dependencies=[Depends(get_current_user), Depends(require_permission("customers.read"))],
    summary="Список клиентов с пагинацией, поиском и фильтрами",
)
async def list_customers_paginated(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    customer_type_id: Optional[int] = Query(None),
    sort_by: Literal["name", "email", "created_at"] = Query("name"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total, total_pages = await repo.get_paginated(
        db,
        search=search,
        customer_type_id=customer_type_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return CustomerPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.get(
    "/export-excel",
    dependencies=[Depends(get_current_user), Depends(require_permission("customers.read"))],
    summary="Экспорт клиентов в Excel",
    description="Скачивает клиентов в формате .xlsx. Поддерживает те же фильтры, что и список клиентов; без фильтров экспортирует всех клиентов."
)
async def export_customers_excel(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    customer_type_id: Optional[int] = Query(None),
):
    customers = await repo.get_export_rows(db, search=search, customer_type_id=customer_type_id)
    buf = build_export_workbook(customers)
    return StreamingResponse(
        buf,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": "attachment; filename=customers_export.xlsx"},
    )

@router.get(
    "/{customer_id}",
    response_model=CustomerRead,
    dependencies=[Depends(get_current_user)],
    summary="Получить клиента по ID",
    description="Возвращает данные конкретного клиента по его ID. Если клиент не найден, возвращает 404."
)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    customer = await repo.get_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return customer

@router.post(
    "/",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("customers.create"))],
    summary="Создать нового клиента",
    description="Создаёт нового клиента с указанными данными: имя, телефон, email, адрес, тип клиента."
)
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    return await repo.create(db, data)

@router.patch(
    "/{customer_id}",
    response_model=CustomerRead,
    dependencies=[Depends(require_permission("customers.update"))],
    summary="Обновить данные клиента",
    description="Обновляет информацию о клиенте по его ID. Обновляемые поля: имя, телефон, email, адрес, тип клиента."
)
async def update_customer(customer_id: int, data: CustomerUpdate, db: AsyncSession = Depends(get_db)):
    customer = await repo.update(db, customer_id, data)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return customer

@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("customers.delete"))],
    summary="Удалить клиента",
    description="Удаляет клиента по его ID. Если клиент не найден — возвращает 404."
)
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await repo.delete(db, customer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Клиент не найден")