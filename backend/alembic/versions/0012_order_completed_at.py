"""V1.6: orders.completed_at（完成時間，營收依此計算）

Revision ID: 0012_order_completed_at
Revises: 0011_order_admin_note
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0012_order_completed_at"
down_revision: Union[str, None] = "0011_order_admin_note"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("completed_at", sa.DateTime(), nullable=True))
    # 既有已完成訂單沒有紀錄完成時間，以最後更新時間回填
    op.execute("UPDATE orders SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL")


def downgrade() -> None:
    op.drop_column("orders", "completed_at")
