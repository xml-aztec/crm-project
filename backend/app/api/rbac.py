from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, is_admin
from app.rbac import service as rbac_service
from app.rbac.models import RbacRole
from app.rbac.schemas import PermissionOut, RoleAssign, RoleCreate, RoleOut, RoleUpdate, RoleUserOut

router = APIRouter(prefix="/rbac", tags=["RBAC"], dependencies=[Depends(is_admin)])


@router.get(
    "/permissions",
    response_model=list[PermissionOut],
    summary="Список всех прав доступа",
    description="Полный справочник прав, доступных в системе (для построения матрицы ролей)."
)
async def list_permissions(db: AsyncSession = Depends(get_db)):
    return await rbac_service.list_permissions(db)


@router.get(
    "/roles",
    response_model=list[RoleOut],
    summary="Список ролей с правами",
    description="Возвращает системные (Admin/Manager/Staff) и кастомные роли с их правами и числом пользователей."
)
async def list_roles(db: AsyncSession = Depends(get_db)):
    return await rbac_service.list_roles_with_details(db)


@router.get(
    "/roles/{role_id}",
    response_model=RoleOut,
    summary="Детали роли",
)
async def get_role(role_id: int, db: AsyncSession = Depends(get_db)):
    role = await rbac_service.get_role_detail(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    return role


@router.post(
    "/roles",
    response_model=RoleOut,
    status_code=201,
    summary="Создать кастомную роль",
    description="Создаёт дополнительную роль с произвольным набором прав. Может быть назначена пользователю в дополнение к его основной роли."
)
async def create_role(data: RoleCreate, db: AsyncSession = Depends(get_db)):
    role = await rbac_service.create_role(data.branch_id, data.name, data.permission_codes, db)
    return await rbac_service.get_role_detail(db, role.id)


@router.patch(
    "/roles/{role_id}",
    response_model=RoleOut,
    summary="Изменить роль",
    description="Обновляет набор прав роли. Название системных ролей (Admin/Manager/Staff) менять нельзя."
)
async def update_role(role_id: int, data: RoleUpdate, db: AsyncSession = Depends(get_db)):
    role = await rbac_service.update_role(
        db, role_id, name=data.name, permission_codes=data.permission_codes
    )
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    return await rbac_service.get_role_detail(db, role_id)


@router.delete(
    "/roles/{role_id}",
    status_code=204,
    summary="Удалить кастомную роль",
    description="Системные роли (Admin/Manager/Staff) удалить нельзя."
)
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await rbac_service.delete_role(db, role_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Роль не найдена")


@router.get(
    "/roles/{role_id}/users",
    response_model=list[RoleUserOut],
    summary="Пользователи с этой ролью",
)
async def get_role_users(role_id: int, db: AsyncSession = Depends(get_db)):
    role = await db.get(RbacRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    return await rbac_service.get_role_users(db, role_id)


@router.get(
    "/users/{user_id}/roles",
    response_model=list[RoleOut],
    summary="Роли пользователя",
)
async def get_user_roles(user_id: int, db: AsyncSession = Depends(get_db)):
    roles = await rbac_service.get_user_roles(db, user_id)
    return [await rbac_service.get_role_detail(db, role.id) for role in roles]


@router.post(
    "/roles/{role_id}/assign",
    status_code=204,
    summary="Назначить кастомную роль пользователю",
    description="Только для кастомных ролей — основная роль (admin/manager/staff) назначается через редактирование профиля пользователя."
)
async def assign_role(role_id: int, data: RoleAssign, db: AsyncSession = Depends(get_db)):
    role = await db.get(RbacRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    if role.is_system:
        raise HTTPException(
            status_code=400,
            detail="Системную роль нельзя назначить напрямую — измените основную роль пользователя в его профиле"
        )
    await rbac_service.assign_role_to_user(data.user_id, role_id, db)


@router.delete(
    "/roles/{role_id}/assign/{user_id}",
    status_code=204,
    summary="Снять кастомную роль с пользователя",
)
async def unassign_role(role_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    await rbac_service.unassign_role_from_user(db, user_id, role_id)
