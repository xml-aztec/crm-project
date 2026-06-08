"""add performance indexes

Revision ID: c3d4e5f6a7b8
Revises: a4676155d11a
Create Date: 2026-06-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a4676155d11a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_orders_user_id', 'orders', ['user_id'])
    op.create_index('ix_orders_created_at', 'orders', ['created_at'])
    op.create_index('ix_orders_status_id', 'orders', ['status_id'])
    op.create_index('ix_orders_confirmed', 'orders', ['confirmed'])
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_cash_flows_date', 'cash_flows', ['date'])


def downgrade() -> None:
    op.drop_index('ix_cash_flows_date', table_name='cash_flows')
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_index('ix_orders_confirmed', table_name='orders')
    op.drop_index('ix_orders_status_id', table_name='orders')
    op.drop_index('ix_orders_created_at', table_name='orders')
    op.drop_index('ix_orders_user_id', table_name='orders')
