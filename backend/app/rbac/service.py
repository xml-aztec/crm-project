from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.rbac.models import Permission, RbacRole, RbacRolePermission, RbacUserRole


async def get_user_permissions(user_id: int, db: AsyncSession) -> set[str]:
    result = await db.execute(
        select(Permission.code)
        .join(RbacRolePermission, RbacRolePermission.permission_id == Permission.id)
        .join(RbacUserRole, RbacUserRole.role_id == RbacRolePermission.role_id)
        .where(RbacUserRole.user_id == user_id)
    )
    return {row[0] for row in result.all()}


async def user_has_permission(user_id: int, permission_code: str, db: AsyncSession) -> bool:
    permissions = await get_user_permissions(user_id, db)
    return permission_code in permissions


async def create_role(
    tenant_id: int | None,
    name: str,
    permission_codes: list[str],
    db: AsyncSession,
) -> RbacRole:
    """`tenant_id` maps to `branch_id` in this single-tenant project — pass the
    branch the role should be scoped to, or None for a global role."""
    role = RbacRole(name=name, branch_id=tenant_id, is_system=False)
    db.add(role)
    await db.flush()

    if permission_codes:
        result = await db.execute(select(Permission).where(Permission.code.in_(permission_codes)))
        permissions = result.scalars().all()
        for perm in permissions:
            db.add(RbacRolePermission(role_id=role.id, permission_id=perm.id))

    await db.commit()
    await db.refresh(role)
    return role


async def assign_role_to_user(user_id: int, role_id: int, db: AsyncSession) -> None:
    existing = await db.execute(
        select(RbacUserRole).where(RbacUserRole.user_id == user_id, RbacUserRole.role_id == role_id)
    )
    if existing.scalar_one_or_none():
        return

    db.add(RbacUserRole(user_id=user_id, role_id=role_id))
    await db.commit()
