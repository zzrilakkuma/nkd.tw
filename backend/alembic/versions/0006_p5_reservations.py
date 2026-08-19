"""P5 stock reservations: convert active orders to reservation scheme

Revision ID: 0006_p5_reservations
Revises: 0005_p3_delivery
Create Date: 2026-08-20

純資料搬移（schema 早已備好 reserved / payment_deadline 欄位）：
- 舊制：下單直接扣 stock。新制：下單保留（reserved），確認入帳才實扣。
- 進行中訂單（等待核對/等待付款/等待入帳確認）轉換：
    stock += qty、reserved += qty
  （可售數量 stock - reserved 不變，僅帳務歸位）
- 「等待付款」但沒有期限的訂單：補上 48 小時寬限期限。
"""
from typing import Sequence, Union
from datetime import datetime, timedelta

from alembic import op
import sqlalchemy as sa


revision: str = "0006_p5_reservations"
down_revision: Union[str, None] = "0005_p3_delivery"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ACTIVE_STATUSES = ("pending_review", "pending_payment", "pending_confirm")


def upgrade() -> None:
    bind = op.get_bind()

    # 1) 進行中訂單：已扣的庫存轉為保留
    rows = bind.execute(
        sa.text(
            "SELECT oi.sku_id, oi.quantity FROM order_items oi "
            "JOIN orders o ON o.id = oi.order_id "
            "WHERE o.status IN :statuses AND oi.sku_id IS NOT NULL"
        ).bindparams(sa.bindparam("statuses", expanding=True)),
        {"statuses": list(ACTIVE_STATUSES)},
    ).fetchall()

    for sku_id, qty in rows:
        bind.execute(
            sa.text(
                "UPDATE skus SET stock = stock + :q, reserved = reserved + :q WHERE id = :id"
            ),
            {"q": qty, "id": sku_id},
        )

    # 2) 等待付款但沒有期限：補 48h 寬限
    deadline = datetime.utcnow() + timedelta(hours=48)
    bind.execute(
        sa.text(
            "UPDATE orders SET payment_deadline = :d "
            "WHERE status = 'pending_payment' AND payment_deadline IS NULL"
        ),
        {"d": deadline},
    )


def downgrade() -> None:
    bind = op.get_bind()
    # 還原：保留轉回直接扣庫存
    rows = bind.execute(
        sa.text(
            "SELECT oi.sku_id, oi.quantity FROM order_items oi "
            "JOIN orders o ON o.id = oi.order_id "
            "WHERE o.status IN :statuses AND oi.sku_id IS NOT NULL"
        ).bindparams(sa.bindparam("statuses", expanding=True)),
        {"statuses": list(ACTIVE_STATUSES)},
    ).fetchall()
    for sku_id, qty in rows:
        bind.execute(
            sa.text(
                "UPDATE skus SET stock = stock - :q, reserved = MAX(0, reserved - :q) WHERE id = :id"
            ),
            {"q": qty, "id": sku_id},
        )
