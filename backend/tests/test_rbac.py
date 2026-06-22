import uuid

import pytest
from sqlalchemy import select

from app.models.role import Role
from app.models.user import User
from app.utils.init_roles import init_roles
from app.rbac.models import RbacRole, RbacUserRole
from app.rbac.seed import (
    PERMISSIONS_MATRIX,
    migrate_users_to_rbac_roles,
    seed_permissions,
    seed_system_roles,
)
from app.rbac.service import assign_role_to_user, create_role, get_user_permissions

pytestmark = pytest.mark.asyncio(loop_scope="session")

TOTAL_PERMISSIONS = sum(len(actions) for actions in PERMISSIONS_MATRIX.values())


async def _make_user(db_session, role_name: str) -> User:
    await init_roles(db_session)
    role = (
        await db_session.execute(select(Role).where(Role.name == role_name))
    ).scalar_one()

    user = User(
        email=f"rbac-test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="not-a-real-hash",
        full_name="RBAC Test User",
        is_active=True,
        is_approved=True,
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_seed_permissions_creates_full_matrix(db_session):
    permissions = await seed_permissions(db_session)
    codes = {p.code for p in permissions}

    assert len(codes) == TOTAL_PERMISSIONS
    for resource, actions in PERMISSIONS_MATRIX.items():
        for action in actions:
            assert f"{resource}.{action}" in codes


async def test_data_migration_maps_legacy_role_to_rbac_role(db_session):
    user = await _make_user(db_session, "manager")

    await migrate_users_to_rbac_roles(db_session)

    result = await db_session.execute(
        select(RbacRole.name)
        .join(RbacUserRole, RbacUserRole.role_id == RbacRole.id)
        .where(RbacUserRole.user_id == user.id)
    )
    assigned_names = {row[0] for row in result.all()}
    assert assigned_names == {"Manager"}


async def test_get_user_permissions_per_system_role(db_session):
    admin_user = await _make_user(db_session, "admin")
    manager_user = await _make_user(db_session, "manager")
    staff_user = await _make_user(db_session, "staff")

    await migrate_users_to_rbac_roles(db_session)

    admin_perms = await get_user_permissions(admin_user.id, db_session)
    manager_perms = await get_user_permissions(manager_user.id, db_session)
    staff_perms = await get_user_permissions(staff_user.id, db_session)

    assert len(admin_perms) == TOTAL_PERMISSIONS

    assert "users.delete" not in manager_perms
    assert "users.manage_roles" not in manager_perms
    assert "cashflow.approve" not in manager_perms
    assert len(manager_perms) == TOTAL_PERMISSIONS - 3

    assert staff_perms == {
        f"{resource}.read" for resource in PERMISSIONS_MATRIX if "read" in PERMISSIONS_MATRIX[resource]
    }


async def test_data_migration_is_idempotent(db_session):
    user = await _make_user(db_session, "staff")

    await migrate_users_to_rbac_roles(db_session)
    first_perms = await get_user_permissions(user.id, db_session)

    counts_second_run = await migrate_users_to_rbac_roles(db_session)
    second_perms = await get_user_permissions(user.id, db_session)

    assert first_perms == second_perms
    assert counts_second_run["Staff"] >= 1

    result = await db_session.execute(
        select(RbacUserRole).where(RbacUserRole.user_id == user.id)
    )
    assert len(result.all()) == 1


async def test_create_role_and_assign_to_user_end_to_end(db_session):
    await seed_permissions(db_session)
    user = await _make_user(db_session, "staff")

    role = await create_role(
        tenant_id=None,
        name="Кладовщик",
        permission_codes=["stock.read", "stock.update"],
        db=db_session,
    )

    await assign_role_to_user(user.id, role.id, db_session)

    permissions = await get_user_permissions(user.id, db_session)
    assert "stock.read" in permissions
    assert "stock.update" in permissions
