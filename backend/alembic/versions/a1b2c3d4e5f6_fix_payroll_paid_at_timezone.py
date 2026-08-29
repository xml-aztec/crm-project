"""fix payroll.paid_at to be timezone-aware

Repository code sets paid_at = datetime.now(timezone.utc) (offset-aware), but
the column was declared as plain DateTime (offset-naive) — asyncpg rejects the
mismatch outright, so POST /payrolls/{id}/pay has failed with a 500 on every
call since it was added. All existing rows have paid_at IS NULL (the endpoint
never successfully completed), so this is a safe type change with no data to
reconcile.

Revision ID: a1b2c3d4e5f6
Revises: f4a1c2b3d9e7
Create Date: 2026-08-29 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f4a1c2b3d9e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'payrolls',
        'paid_at',
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'payrolls',
        'paid_at',
        type_=sa.DateTime(),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
    )
