"""V1.2: orders.discount / orders.invoice + images table

Revision ID: 0008_v12_invoice_discount_images
Revises: 0007_p6_audit_logs
Create Date: 2026-08-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_v12_invoice_discount_images"
down_revision: Union[str, None] = "0007_p6_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("discount", sa.Float(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("invoice", sa.JSON(), nullable=True))

    op.create_table(
        "images",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_images_id", "images", ["id"])


def downgrade() -> None:
    op.drop_table("images")
    op.drop_column("orders", "invoice")
    op.drop_column("orders", "discount")
