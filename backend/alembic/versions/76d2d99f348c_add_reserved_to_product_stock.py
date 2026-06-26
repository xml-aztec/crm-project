"""add reserved to product_stock

Revision ID: 76d2d99f348c
Revises: c7d8e9f0a1b2
Create Date: 2026-06-26 16:43:25.893515

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '76d2d99f348c'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'product_stock',
        sa.Column('reserved', sa.Integer(), server_default='0', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('product_stock', 'reserved')
