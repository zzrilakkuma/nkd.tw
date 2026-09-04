"""V1.3: orders.payment_type（月結）

Revision ID: 0009_monthly_payment_type
Revises: 0008_v12_invoice_discount_images
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_monthly_payment_type"
down_revision: Union[str, None] = "0008_v12_invoice_discount_images"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("payment_type", sa.String(), nullable=False, server_default="normal"),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_type")
