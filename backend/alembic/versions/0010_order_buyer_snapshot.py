"""V1.4: orders.buyer（下單帳號快照）

Revision ID: 0010_order_buyer_snapshot
Revises: 0009_monthly_payment_type
Create Date: 2026-09-10
"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0010_order_buyer_snapshot"
down_revision: Union[str, None] = "0009_monthly_payment_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("buyer", sa.JSON(), nullable=True))

    # 既有訂單以目前的帳號資料回填快照
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT o.id, u.username, u.email, u.company_name, u.contact_name, u.contact_phone, u.tax_id "
        "FROM orders o JOIN users u ON u.id = o.user_id"
    )).fetchall()
    for r in rows:
        buyer = {
            "username": r[1],
            "email": r[2],
            "company_name": r[3],
            "contact_name": r[4],
            "contact_phone": r[5],
            "tax_id": r[6],
        }
        conn.execute(
            sa.text("UPDATE orders SET buyer = :buyer WHERE id = :id"),
            {"buyer": json.dumps(buyer, ensure_ascii=False), "id": r[0]},
        )


def downgrade() -> None:
    op.drop_column("orders", "buyer")
