"""create system rbac roles and migrate existing users into rbac_user_roles

Stage B data migration. For each existing user, reads their legacy
`roles.name` (via users.role_id) and creates a matching row in
rbac_user_roles pointing at the new system RbacRole (Admin/Manager/Staff).
Does NOT modify users.role_id or the legacy `roles` table.

System roles are global (branch_id=NULL), matching current access-check
behavior which is not branch-scoped.

Idempotent: checks for existing rows before inserting, both for the
role/permission assignments and the per-user role assignments.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-06-22 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mirrors app.rbac.seed.PERMISSIONS_MATRIX / SYSTEM_ROLE_EXCLUDED_PERMISSIONS as
# of this migration's creation date — frozen on purpose, see e5f6a7b8c9d0.
PERMISSIONS_MATRIX = {
    "products": ["create", "read", "update", "delete"],
    "stock": ["create", "read", "update", "delete"],
    "cashflow": ["create", "read", "update", "delete", "approve"],
    "supplies": ["create", "read", "update", "delete", "approve"],
    "orders": ["create", "read", "update", "delete"],
    "users": ["invite", "read", "update", "delete", "manage_roles"],
    "payroll": ["create", "read", "update", "delete"],
    "reports": ["read", "export"],
}
SYSTEM_ROLE_EXCLUDED_PERMISSIONS = {
    "Admin": set(),
    "Manager": {"users.delete", "users.manage_roles", "cashflow.approve"},
}
LEGACY_ROLE_NAME_MAP = {
    "admin": "Admin",
    "manager": "Manager",
    "staff": "Staff",
}

permissions_table = sa.table(
    "permissions", sa.column("id", sa.Integer), sa.column("code", sa.String), sa.column("action", sa.String)
)
rbac_roles_table = sa.table(
    "rbac_roles",
    sa.column("id", sa.Integer),
    sa.column("branch_id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("is_system", sa.Boolean),
)
rbac_role_permissions_table = sa.table(
    "rbac_role_permissions", sa.column("role_id", sa.Integer), sa.column("permission_id", sa.Integer)
)
rbac_user_roles_table = sa.table(
    "rbac_user_roles", sa.column("user_id", sa.Integer), sa.column("role_id", sa.Integer)
)
legacy_roles_table = sa.table("roles", sa.column("id", sa.Integer), sa.column("name", sa.String))
users_table = sa.table("users", sa.column("id", sa.Integer), sa.column("role_id", sa.Integer))


def _permission_codes_for_role(role_name, all_permissions):
    if role_name == "Staff":
        return {p.code for p in all_permissions if p.action == "read"}
    excluded = SYSTEM_ROLE_EXCLUDED_PERMISSIONS.get(role_name, set())
    return {p.code for p in all_permissions if p.code not in excluded}


def upgrade() -> None:
    bind = op.get_bind()

    all_permissions = bind.execute(
        sa.select(permissions_table.c.id, permissions_table.c.code, permissions_table.c.action)
    ).fetchall()
    permissions_by_code = {row.code: row for row in all_permissions}

    system_role_ids = {}
    for role_name in ("Admin", "Manager", "Staff"):
        existing = bind.execute(
            sa.select(rbac_roles_table.c.id).where(
                rbac_roles_table.c.name == role_name,
                rbac_roles_table.c.is_system.is_(True),
                rbac_roles_table.c.branch_id.is_(None),
            )
        ).fetchone()

        if existing:
            role_id = existing.id
        else:
            result = bind.execute(
                sa.insert(rbac_roles_table)
                .values(branch_id=None, name=role_name, is_system=True)
                .returning(rbac_roles_table.c.id)
            )
            role_id = result.fetchone().id

        system_role_ids[role_name] = role_id

        wanted_codes = _permission_codes_for_role(role_name, all_permissions)
        existing_perm_ids = {
            row.permission_id
            for row in bind.execute(
                sa.select(rbac_role_permissions_table.c.permission_id).where(
                    rbac_role_permissions_table.c.role_id == role_id
                )
            ).fetchall()
        }

        new_rows = [
            {"role_id": role_id, "permission_id": permissions_by_code[code].id}
            for code in wanted_codes
            if permissions_by_code[code].id not in existing_perm_ids
        ]
        if new_rows:
            op.bulk_insert(rbac_role_permissions_table, new_rows)

    user_rows = bind.execute(
        sa.select(users_table.c.id, legacy_roles_table.c.name)
        .select_from(users_table.join(legacy_roles_table, users_table.c.role_id == legacy_roles_table.c.id))
    ).fetchall()

    counts = {"Admin": 0, "Manager": 0, "Staff": 0}
    new_assignments = []
    for user_id, legacy_role_name in user_rows:
        target_role_name = LEGACY_ROLE_NAME_MAP.get((legacy_role_name or "").lower())
        if not target_role_name:
            continue
        target_role_id = system_role_ids[target_role_name]

        already_assigned = bind.execute(
            sa.select(rbac_user_roles_table.c.user_id).where(
                rbac_user_roles_table.c.user_id == user_id,
                rbac_user_roles_table.c.role_id == target_role_id,
            )
        ).fetchone()

        counts[target_role_name] += 1
        if already_assigned:
            continue
        new_assignments.append({"user_id": user_id, "role_id": target_role_id})

    if new_assignments:
        op.bulk_insert(rbac_user_roles_table, new_assignments)

    print(
        "RBAC user migration: "
        + ", ".join(f"{name}: {count} users" for name, count in counts.items())
    )


def downgrade() -> None:
    bind = op.get_bind()
    role_ids = [
        row.id
        for row in bind.execute(
            sa.select(rbac_roles_table.c.id).where(
                rbac_roles_table.c.is_system.is_(True), rbac_roles_table.c.branch_id.is_(None)
            )
        ).fetchall()
    ]
    if role_ids:
        bind.execute(sa.delete(rbac_user_roles_table).where(rbac_user_roles_table.c.role_id.in_(role_ids)))
        bind.execute(sa.delete(rbac_role_permissions_table).where(rbac_role_permissions_table.c.role_id.in_(role_ids)))
        bind.execute(sa.delete(rbac_roles_table).where(rbac_roles_table.c.id.in_(role_ids)))
