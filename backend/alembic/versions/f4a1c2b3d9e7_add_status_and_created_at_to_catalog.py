"""add is_active/created_at + indexes to categories, subcategories, brands

Revision ID: f4a1c2b3d9e7
Revises: 76d2d99f348c
Create Date: 2026-08-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f4a1c2b3d9e7'
down_revision: Union[str, None] = '76d2d99f348c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ("categories", "subcategories", "brands")


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
        op.add_column(table, sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        op.create_index(f'ix_{table}_is_active', table, ['is_active'])
        op.create_index(f'ix_{table}_created_at', table, ['created_at'])

    op.create_index('ix_subcategories_name', 'subcategories', ['name'])
    op.create_index('ix_subcategories_category_id', 'subcategories', ['category_id'])


def downgrade() -> None:
    op.drop_index('ix_subcategories_category_id', table_name='subcategories')
    op.drop_index('ix_subcategories_name', table_name='subcategories')

    for table in TABLES:
        op.drop_index(f'ix_{table}_created_at', table_name=table)
        op.drop_index(f'ix_{table}_is_active', table_name=table)
        op.drop_column(table, 'created_at')
        op.drop_column(table, 'is_active')
