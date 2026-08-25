"""訂單狀態機與庫存帳務：集中管理合法狀態轉換、保留/實扣/釋放。

庫存帳務（P5 保留機制）：
  - 下單：reserved += qty（不動實體庫存）；可售 = stock - reserved
  - 確認入帳 → 準備出貨：stock -= qty、reserved -= qty（實扣）
  - 取消/逾期（實扣前）：reserved -= qty（釋放保留）
  - 取消（準備出貨後）：stock += qty（貨退回實體庫存）
"""
from typing import Dict, Set
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.product import SKU


S = OrderStatus

# 合法轉換表
ALLOWED_TRANSITIONS: Dict[OrderStatus, Set[OrderStatus]] = {
    S.PENDING_REVIEW: {S.PENDING_PAYMENT, S.CANCELLED},
    S.PENDING_PAYMENT: {S.PENDING_CONFIRM, S.CANCELLED, S.EXPIRED},
    S.PENDING_CONFIRM: {S.PREPARING, S.CANCELLED},
    S.PREPARING: {S.COMPLETED, S.CANCELLED},
    S.COMPLETED: set(),
    S.CANCELLED: set(),
    S.EXPIRED: set(),
}

# 這些狀態下訂單持有「保留量」（尚未實扣庫存）
RESERVATION_HELD = {S.PENDING_REVIEW, S.PENDING_PAYMENT, S.PENDING_CONFIRM}


def as_status(value) -> OrderStatus:
    if isinstance(value, OrderStatus):
        return value
    return OrderStatus(value)


def can_transition(current, target) -> bool:
    current = as_status(current)
    target = as_status(target)
    return target in ALLOWED_TRANSITIONS.get(current, set())


def _each_sku(db: Session, order: Order):
    for item in order.items:
        if not item.sku_id:
            continue
        sku = db.query(SKU).filter(SKU.id == item.sku_id).first()
        if sku:
            yield sku, item.quantity


def reserve_stock(db: Session, order: Order) -> None:
    """下單：保留庫存（reserved += qty）。"""
    for sku, qty in _each_sku(db, order):
        sku.reserved = (sku.reserved or 0) + qty


def release_reservation(db: Session, order: Order) -> None:
    """取消/逾期（實扣前）：釋放保留量。"""
    for sku, qty in _each_sku(db, order):
        sku.reserved = max(0, (sku.reserved or 0) - qty)


def commit_stock(db: Session, order: Order) -> None:
    """確認入帳 → 準備出貨：實扣庫存並解除保留。"""
    for sku, qty in _each_sku(db, order):
        sku.stock = (sku.stock or 0) - qty
        sku.reserved = max(0, (sku.reserved or 0) - qty)


def return_stock(db: Session, order: Order) -> None:
    """準備出貨後取消：貨退回實體庫存。"""
    for sku, qty in _each_sku(db, order):
        sku.stock = (sku.stock or 0) + qty


def apply_inventory_on_transition(db: Session, order: Order, current: OrderStatus, target: OrderStatus) -> None:
    """依狀態轉換套用對應的庫存帳務（唯一入口，避免邏輯散落）。"""
    # 確認入帳 → 準備出貨：實扣
    if target == S.PREPARING:
        commit_stock(db, order)
        return

    # 結束性狀態
    if target in (S.CANCELLED, S.EXPIRED):
        if current in RESERVATION_HELD:
            release_reservation(db, order)   # 尚未實扣 → 釋放保留
        elif current == S.PREPARING:
            return_stock(db, order)          # 已實扣 → 退回庫存
        # COMPLETED 不可再轉，無需處理


def recompute_totals(order: Order) -> None:
    """依項目重算 subtotal，total = max(0, subtotal - 折扣) + 運費。"""
    order.subtotal = sum((i.price or 0) * i.quantity for i in order.items)
    discounted = max(0.0, (order.subtotal or 0) - (order.discount or 0))
    order.total_amount = discounted + (order.shipping_fee or 0)
