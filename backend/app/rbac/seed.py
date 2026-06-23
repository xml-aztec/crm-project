"""Canonical RBAC seed data for the live app (lifespan startup).

The Alembic data migrations under alembic/versions/ duplicate this matrix as
static literals on purpose — migrations are frozen snapshots and must not
change behavior retroactively if this matrix evolves later.
"""
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User
from app.rbac.models import Permission, RbacRole, RbacRolePermission, RbacUserRole

logger = structlog.get_logger()

PERMISSIONS_MATRIX: dict[str, list[str]] = {
    "products": ["create", "read", "update", "delete"],
    "stock": ["create", "read", "update", "delete"],
    "cashflow": ["create", "read", "update", "delete", "approve"],
    "supplies": ["create", "read", "update", "delete", "approve"],
    "orders": ["create", "read", "update", "delete"],
    "users": ["invite", "read", "update", "delete", "manage_roles"],
    "payroll": ["create", "read", "update", "delete"],
    "reports": ["read", "export"],
    "customers": ["create", "read", "update", "delete"],
}

SYSTEM_ROLE_EXCLUDED_PERMISSIONS: dict[str, set[str]] = {
    "Admin": set(),
    "Manager": {"users.delete", "users.manage_roles", "cashflow.approve"},
    "Staff": None,  # sentinel: Staff gets *.read only, computed separately
}

# Maps the legacy `roles.name` enum-like values to the new system RbacRole names.
LEGACY_ROLE_NAME_MAP: dict[str, str] = {
    "admin": "Admin",
    "manager": "Manager",
    "staff": "Staff",
}


async def seed_permissions(db: AsyncSession) -> list[Permission]:
    """Idempotently inserts the full permission matrix. Returns all permissions."""
    result = await db.execute(select(Permission))
    existing_codes = {p.code for p in result.scalars().all()}

    created = []
    for resource, actions in PERMISSIONS_MATRIX.items():
        for action in actions:
            code = f"{resource}.{action}"
            if code in existing_codes:
                continue
            perm = Permission(resource=resource, action=action, code=code)
            db.add(perm)
            created.append(perm)

    if created:
        await db.commit()
        logger.info("rbac_permissions_seeded", count=len(created))

    result = await db.execute(select(Permission))
    return list(result.scalars().all())


def _permission_codes_for_role(role_name: str, all_permissions: list[Permission]) -> set[str]:
    if role_name == "Staff":
        return {p.code for p in all_permissions if p.action == "read"}
    excluded = SYSTEM_ROLE_EXCLUDED_PERMISSIONS.get(role_name, set())
    return {p.code for p in all_permissions if p.code not in excluded}


async def _get_or_create_system_role(db: AsyncSession, name: str) -> RbacRole:
    result = await db.execute(
        select(RbacRole).where(
            RbacRole.name == name,
            RbacRole.is_system.is_(True),
            RbacRole.branch_id.is_(None),
        )
    )
    role = result.scalar_one_or_none()
    if role:
        return role
    role = RbacRole(name=name, branch_id=None, is_system=True)
    db.add(role)
    await db.flush()
    return role


async def seed_system_roles(db: AsyncSession) -> dict[str, RbacRole]:
    """Idempotently creates the global (branch_id=None) Admin/Manager/Staff
    RbacRoles and assigns them their permission sets."""
    all_permissions = await seed_permissions(db)
    permissions_by_code = {p.code: p for p in all_permissions}

    roles: dict[str, RbacRole] = {}
    for role_name in ("Admin", "Manager", "Staff"):
        role = await _get_or_create_system_role(db, role_name)
        roles[role_name] = role

        wanted_codes = _permission_codes_for_role(role_name, all_permissions)

        result = await db.execute(
            select(RbacRolePermission.permission_id).where(RbacRolePermission.role_id == role.id)
        )
        existing_permission_ids = {row[0] for row in result.all()}

        for code in wanted_codes:
            perm = permissions_by_code[code]
            if perm.id in existing_permission_ids:
                continue
            db.add(RbacRolePermission(role_id=role.id, permission_id=perm.id))

    await db.commit()
    return roles


async def migrate_users_to_rbac_roles(db: AsyncSession) -> dict[str, int]:
    """Idempotently assigns every existing User a RbacUserRole matching their
    legacy `role.name`. Returns counts per system role name for logging."""
    system_roles = await seed_system_roles(db)

    result = await db.execute(select(User).join(Role, User.role_id == Role.id).add_columns(Role.name))
    rows = result.all()

    counts = {name: 0 for name in system_roles}
    for user, legacy_role_name in rows:
        target_role_name = LEGACY_ROLE_NAME_MAP.get((legacy_role_name or "").lower())
        if not target_role_name:
            continue
        target_role = system_roles[target_role_name]

        existing = await db.execute(
            select(RbacUserRole).where(
                RbacUserRole.user_id == user.id, RbacUserRole.role_id == target_role.id
            )
        )
        if existing.scalar_one_or_none():
            counts[target_role_name] += 1
            continue

        db.add(RbacUserRole(user_id=user.id, role_id=target_role.id))
        counts[target_role_name] += 1

    await db.commit()
    logger.info("rbac_users_migrated", **counts)
    return counts
