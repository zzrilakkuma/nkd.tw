"""P3 delivery methods: orders.delivery_method + pickup_locations

Revision ID: 0005_p3_delivery
Revises: 0004_p2_order_states
Create Date: 2026-08-18

- orders 新增 delivery_method（既有訂單回填 home_delivery）
- 新增 pickup_locations 資料表（自取地點）
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_p3_delivery"
down_revision: Union[str, None] = "0004_p2_order_states"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("delivery_method", sa.String(), nullable=True))
    # 既有訂單皆為宅配格式，回填 home_delivery
    op.get_bind().execute(
        sa.text("UPDATE orders SET delivery_method = 'home_delivery' WHERE delivery_method IS NULL")
    )

    op.create_table(
        "pickup_locations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("contact", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pickup_locations_id", "pickup_locations", ["id"])


def downgrade() -> None:
    op.drop_table("pickup_locations")
    op.drop_column("orders", "delivery_method")
