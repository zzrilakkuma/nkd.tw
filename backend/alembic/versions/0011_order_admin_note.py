"""V1.5: orders.admin_note（管理員內部備註）

Revision ID: 0011_order_admin_note
Revises: 0010_order_buyer_snapshot
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0011_order_admin_note"
down_revision: Union[str, None] = "0010_order_buyer_snapshot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("admin_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "admin_note")
