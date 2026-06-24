"""add order_id to stock_logs

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-24 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('stock_logs', sa.Column('order_id', sa.Integer(), nullable=True))
    op.create_index('ix_stock_logs_order_id', 'stock_logs', ['order_id'])
    op.create_foreign_key(
        'fk_stock_logs_order_id_orders',
        'stock_logs', 'orders',
        ['order_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_stock_logs_order_id_orders', 'stock_logs', type_='foreignkey')
    op.drop_index('ix_stock_logs_order_id', table_name='stock_logs')
    op.drop_column('stock_logs', 'order_id')
