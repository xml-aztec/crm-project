"""seed rbac permissions matrix

Stage A data seed. Static/frozen permission list — do not import this from
app.rbac.seed, since that module's matrix may evolve after this migration
was written; migrations must stay reproducible regardless of later app changes.

Idempotent: skips any code that already exists.

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-06-22 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

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

permissions_table = sa.table(
    "permissions",
    sa.column("resource", sa.String),
    sa.column("action", sa.String),
    sa.column("code", sa.String),
)


def upgrade() -> None:
    bind = op.get_bind()
    existing_codes = {
        row[0] for row in bind.execute(sa.select(permissions_table.c.code)).fetchall()
    }

    rows = []
    for resource, actions in PERMISSIONS_MATRIX.items():
        for action in actions:
            code = f"{resource}.{action}"
            if code in existing_codes:
                continue
            rows.append({"resource": resource, "action": action, "code": code})

    if rows:
        op.bulk_insert(permissions_table, rows)


def downgrade() -> None:
    bind = op.get_bind()
    all_codes = [
        f"{resource}.{action}"
        for resource, actions in PERMISSIONS_MATRIX.items()
        for action in actions
    ]
    bind.execute(sa.delete(permissions_table).where(permissions_table.c.code.in_(all_codes)))
