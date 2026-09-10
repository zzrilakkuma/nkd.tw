"""48 小時付款逾期處理。

- expire_overdue_orders：掃描「等待付款」且已超過 payment_deadline 的訂單，
  標記為 EXPIRED 並釋放保留庫存。由背景排程定期呼叫，
  付款端點也會在提交前做惰性檢查。
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.services.order_state import release_reservation
from app.services.email_notify import snapshot_order, send_status_email


def expire_overdue_orders(db: Session) -> int:
    """將逾期的等待付款訂單標記為已逾期並釋放庫存，回傳處理筆數。"""
    now = datetime.utcnow()
    overdue = (
        db.query(Order)
        .filter(
            Order.status == OrderStatus.PENDING_PAYMENT.value,
            Order.payment_deadline.isnot(None),
            Order.payment_deadline < now,
        )
        .all()
    )
    snapshots = []
    for order in overdue:
        release_reservation(db, order)
        order.status = OrderStatus.EXPIRED.value
        snapshots.append(snapshot_order(order))
    if overdue:
        db.commit()
        # 本函式已在背景排程執行，直接同步寄逾期通知
        for snap in snapshots:
            send_status_email(snap)
    return len(overdue)


def is_overdue(order: Order) -> bool:
    """惰性判定：訂單是否為逾期的等待付款單。"""
    return (
        order.status == OrderStatus.PENDING_PAYMENT.value
        and order.payment_deadline is not None
        and order.payment_deadline < datetime.utcnow()
    )
