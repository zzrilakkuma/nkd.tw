"""P2 order state machine: 7 states + subtotal/shipping_fee/locked/paid_at/deadline

Revision ID: 0004_p2_order_states
Revises: 0003_p1_catalog
Create Date: 2026-08-18

- 將 orders.status 由舊 6 態（大寫 enum 名）改為新 7 態（小寫字串值）
- 移除舊 enum/check 限制（跨資料庫）
- 新增 subtotal / shipping_fee / locked / paid_at / payment_deadline
- 回填 subtotal = total_amount（歷史運費視為 0）
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_p2_order_states"
down_revision: Union[str, None] = "0003_p1_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 舊 enum 名 -> 新狀態值
STATUS_MAP = {
    "PENDING": "pending_payment",
    "PAYMENT_SUBMITTED": "pending_confirm",
    "CONFIRMED": "preparing",
    "SHIPPED": "preparing",
    "DELIVERED": "completed",
    "CANCELLED": "cancelled",
}

# 還原用（新 -> 舊；多對一無法完整還原，取代表值）
REVERSE_MAP = {
    "pending_review": "PENDING",
    "pending_payment": "PENDING",
    "pending_confirm": "PAYMENT_SUBMITTED",
    "preparing": "CONFIRMED",
    "completed": "DELIVERED",
    "cancelled": "CANCELLED",
    "expired": "CANCELLED",
}


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # 1) 狀態欄位改為純字串，移除舊 enum/check 限制
    if dialect == "postgresql":
        op.execute("ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(32) USING status::text")
    else:
        with op.batch_alter_table("orders") as batch:
            batch.alter_column(
                "status",
                type_=sa.String(length=32),
                existing_type=sa.String(length=17),
                existing_nullable=True,
            )

    # 2) 值重新對應
    for old, new in STATUS_MAP.items():
        bind.execute(
            sa.text("UPDATE orders SET status = :new WHERE status = :old"),
            {"new": new, "old": old},
        )

    # 3) 新欄位
    op.add_column("orders", sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("shipping_fee", sa.Float(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("orders", sa.Column("paid_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("payment_deadline", sa.DateTime(), nullable=True))

    # 4) 回填 subtotal = total_amount
    bind.execute(sa.text("UPDATE orders SET subtotal = total_amount"))

    # 5) PG：移除不再使用的 enum 型別
    if dialect == "postgresql":
        op.execute("DROP TYPE IF EXISTS orderstatus")


def downgrade() -> None:
    bind = op.get_bind()

    # 還原狀態值
    for new, old in REVERSE_MAP.items():
        bind.execute(
            sa.text("UPDATE orders SET status = :old WHERE status = :new"),
            {"old": old, "new": new},
        )

    op.drop_column("orders", "payment_deadline")
    op.drop_column("orders", "paid_at")
    op.drop_column("orders", "locked")
    op.drop_column("orders", "shipping_fee")
    op.drop_column("orders", "subtotal")
