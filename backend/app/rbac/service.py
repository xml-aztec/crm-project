from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role as LegacyRole
from app.models.user import User
from app.rbac.models import Permission, RbacRole, RbacRolePermission, RbacUserRole
from app.rbac.seed import LEGACY_ROLE_NAME_MAP


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


async def sync_rbac_role_for_user(user_id: int, db: AsyncSession) -> None:
    """Re-reads the user's current legacy `roles.name` (via User.role_id) and
    reconciles their RBAC system-role assignment to match it: removes any
    stale Admin/Manager/Staff assignment and adds the correct one. Call this
    right after creating a user or changing their `role_id` (registration,
    admin update) so RBAC access is correct immediately — without this, a user
    would have no RBAC permissions until the next app restart's bulk
    migration (`migrate_users_to_rbac_roles`), which only runs at lifespan
    startup. Does not touch custom (non-system) role assignments."""
    legacy_role_name = await db.scalar(
        select(LegacyRole.name).join(User, User.role_id == LegacyRole.id).where(User.id == user_id)
    )
    target_role_name = LEGACY_ROLE_NAME_MAP.get((legacy_role_name or "").lower())

    result = await db.execute(
        select(RbacUserRole.role_id, RbacRole.name)
        .join(RbacRole, RbacRole.id == RbacUserRole.role_id)
        .where(
            RbacUserRole.user_id == user_id,
            RbacRole.is_system.is_(True),
            RbacRole.branch_id.is_(None),
        )
    )
    current_system_roles = {name: role_id for role_id, name in result.all()}

    if target_role_name in current_system_roles:
        stale_role_ids = [
            role_id for name, role_id in current_system_roles.items() if name != target_role_name
        ]
        if stale_role_ids:
            await db.execute(
                delete(RbacUserRole).where(
                    RbacUserRole.user_id == user_id, RbacUserRole.role_id.in_(stale_role_ids)
                )
            )
        return

    if current_system_roles:
        await db.execute(
            delete(RbacUserRole).where(
                RbacUserRole.user_id == user_id,
                RbacUserRole.role_id.in_(current_system_roles.values()),
            )
        )

    if not target_role_name:
        return

    target_role_id = await db.scalar(
        select(RbacRole.id).where(
            RbacRole.name == target_role_name,
            RbacRole.is_system.is_(True),
            RbacRole.branch_id.is_(None),
        )
    )
    if target_role_id:
        db.add(RbacUserRole(user_id=user_id, role_id=target_role_id))


async def is_rbac_admin(user_id: int, db: AsyncSession) -> bool:
    result = await db.execute(
        select(RbacUserRole.user_id)
        .join(RbacRole, RbacRole.id == RbacUserRole.role_id)
        .where(
            RbacUserRole.user_id == user_id,
            RbacRole.name == "Admin",
            RbacRole.is_system.is_(True),
        )
    )
    return result.first() is not None


async def user_is_admin(user: User, db: AsyncSession) -> bool:
    """Stage D: RBAC is now the sole source of truth for admin access. The
    legacy `roles.name` fallback was removed once real-time sync
    (`sync_rbac_role_for_user`, called from registration and admin updates)
    guaranteed every user always has a matching RBAC assignment."""
    return await is_rbac_admin(user.id, db)
