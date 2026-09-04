from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import time

from app.core.database import get_db
from app.core.config import settings
from app.models.order import Order, OrderItem, OrderStatus, DeliveryMethod, PaymentType
from app.models.product import Product, SKU
from app.models.pickup_location import PickupLocation
from app.models.user import User
from app.schemas.order import OrderCreate, StatusChange, VerifyOrder, UpdateOrderItems, PaymentSubmit, OrderResponse
from app.api.dependencies import get_current_user, get_current_admin_user
from app.services.order_state import (
    can_transition,
    recompute_totals,
    apply_inventory_on_transition,
    release_reservation,
    commit_stock,
)
from app.services.order_expiry import expire_overdue_orders, is_overdue
from app.services.audit import log_action

router = APIRouter()


# 各配送方式的必填欄位（自取另行以 pickup_location_id 解析）
_REQUIRED_SHIPPING_FIELDS = {
    DeliveryMethod.HOME_DELIVERY: ["name", "phone", "city", "postalCode", "address"],
    DeliveryMethod.CVS_711: ["name", "phone", "store_name", "store_code"],
}


def _build_shipping_info(method: DeliveryMethod, info: dict, db: Session) -> dict:
    """依配送方式驗證必填欄位並回傳要保存的 shipping_info（自取會快照地點）。"""
    info = dict(info or {})

    if method == DeliveryMethod.SELF_PICKUP:
        loc_id = info.get("pickup_location_id")
        if not loc_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="請選擇自取地點")
        loc = db.query(PickupLocation).filter(
            PickupLocation.id == loc_id, PickupLocation.is_active == True  # noqa: E712
        ).first()
        if not loc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="自取地點不存在或已停用")
        # 快照地點資訊，避免日後修改影響舊訂單
        return {
            "pickup_location_id": loc.id,
            "name": info.get("name") or loc.name,
            "phone": info.get("phone", ""),
            "location_name": loc.name,
            "address": loc.address,
            "contact": loc.contact,
            "note": info.get("note", ""),
        }

    required = _REQUIRED_SHIPPING_FIELDS.get(method, [])
    missing = [f for f in required if not str(info.get(f, "")).strip()]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"配送資訊缺少必填欄位：{'、'.join(missing)}",
        )
    return info


# 訂單編號生成器（防止重複）
_last_timestamp = 0
_sequence = 0


def generate_order_id() -> str:
    """生成6位純數字訂單編號（時間戳4位 + 流水號2位）"""
    global _last_timestamp, _sequence
    now = int(time.time() * 1000)
    if now == _last_timestamp:
        _sequence = (_sequence + 1) % 100
    else:
        _last_timestamp = now
        _sequence = 0
    return str(now)[-4:] + str(_sequence).zfill(2)


def _get_order_or_404(db: Session, order_id: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="訂單不存在")
    return order


@router.post("", response_model=OrderResponse)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """建立訂單：以 SKU 為單位，金額由後端重算，狀態進入「等待管理員核對」"""
    method = order_data.delivery_method
    shipping_info = _build_shipping_info(method, order_data.shipping_info, db)
    default_fee = settings.default_shipping_fees.get(method.value, 0)

    # 發票資訊（選填）：統編需為 8 碼數字
    invoice = None
    if order_data.invoice is not None:
        tax_id = order_data.invoice.tax_id.strip()
        company = order_data.invoice.company_name.strip()
        if not (tax_id.isdigit() and len(tax_id) == 8):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="統一編號需為 8 碼數字")
        if not company:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="請填寫發票抬頭（公司名稱）")
        invoice = {"tax_id": tax_id, "company_name": company}

    order = Order(
        id=generate_order_id(),
        user_id=current_user.id,
        status=OrderStatus.PENDING_REVIEW.value,
        delivery_method=method.value,
        subtotal=0,
        shipping_fee=default_fee,
        total_amount=0,
        shipping_info=shipping_info,
        invoice=invoice,
    )

    for item_data in order_data.items:
        sku = db.query(SKU).filter(SKU.id == item_data.sku_id).first()
        if not sku or not sku.is_active:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                detail=f"SKU {item_data.sku_id} 不存在或已下架",
            )
        if item_data.quantity <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="數量必須大於 0")
        if sku.available < item_data.quantity:
            product = db.query(Product).filter(Product.id == sku.product_id).first()
            name = product.name if product else sku.product_id
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"商品 {name} 庫存不足")

        order.items.append(OrderItem(
            order_id=order.id,
            product_id=sku.product_id,
            sku_id=sku.id,
            quantity=item_data.quantity,
            price=sku.price,
        ))
        # P5 保留機制：下單保留庫存（不動實體庫存），確認入帳後才實扣
        sku.reserved = (sku.reserved or 0) + item_data.quantity

    recompute_totals(order)

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[OrderResponse])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Order).filter(Order.user_id == current_user.id).all()


@router.get("/admin/all", response_model=List[OrderResponse])
def get_all_orders(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    # 新訂單排在前面
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = _get_order_or_404(db, order_id)
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="權限不足")
    return order


@router.post("/{order_id}/pay", response_model=OrderResponse)
def submit_payment(
    order_id: str,
    data: PaymentSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """客戶提交付款：等待付款 → 等待入帳確認（提交後停止 48h 倒數）"""
    order = _get_order_or_404(db, order_id)
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="權限不足")
    if OrderStatus(order.status) != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="此訂單目前無法提交付款")

    # 惰性逾期檢查：已超過付款期限則直接標記逾期並釋放庫存
    if is_overdue(order):
        apply_inventory_on_transition(db, order, OrderStatus.PENDING_PAYMENT, OrderStatus.EXPIRED)
        order.status = OrderStatus.EXPIRED.value
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="此訂單已超過付款期限，已自動取消")

    order.status = OrderStatus.PENDING_CONFIRM.value
    order.paid_at = datetime.utcnow()
    order.payment_info = {
        "last5Digits": data.last5Digits,
        "completedAt": datetime.utcnow().isoformat(),
    }
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """客戶取消訂單（限提交付款前）；同時釋放庫存"""
    order = _get_order_or_404(db, order_id)
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="權限不足")

    current = OrderStatus(order.status)
    if current not in (OrderStatus.PENDING_REVIEW, OrderStatus.PENDING_PAYMENT):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="此狀態的訂單無法取消")

    apply_inventory_on_transition(db, order, current, OrderStatus.CANCELLED)
    order.status = OrderStatus.CANCELLED.value
    log_action(
        db, current_user, "ORDER_CANCEL", "order", order.id,
        summary=f"取消訂單 #{order.id}",
        before={"status": current.value}, after={"status": "cancelled"},
    )
    db.commit()
    db.refresh(order)
    return order



@router.put("/{order_id}/items", response_model=OrderResponse)
def update_order_items(
    order_id: str,
    data: UpdateOrderItems,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """管理員於「等待核對」階段調整品項/數量（可同時設定折扣）。

    作法：先釋放原保留 → 依新內容重建項目並重新保留（檢查可售量）→ 重算金額。
    """
    order = _get_order_or_404(db, order_id)
    if OrderStatus(order.status) != OrderStatus.PENDING_REVIEW:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="僅能在「等待核對」階段調整品項")
    if not data.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="訂單至少需一個品項")

    before_items = [
        {"sku_id": i.sku_id, "name": (i.product.name if i.product else i.product_id),
         "quantity": i.quantity, "price": i.price}
        for i in order.items
    ]

    # 1) 釋放原保留、移除原項目
    release_reservation(db, order)
    for item in list(order.items):
        db.delete(item)
    order.items.clear()
    db.flush()

    # 2) 依新內容建立項目並重新保留
    for item_data in data.items:
        sku = db.query(SKU).filter(SKU.id == item_data.sku_id).first()
        if not sku or not sku.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"SKU {item_data.sku_id} 不存在或已下架")
        if item_data.quantity <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="數量必須大於 0")
        if sku.available < item_data.quantity:
            product = db.query(Product).filter(Product.id == sku.product_id).first()
            name = product.name if product else sku.product_id
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"商品 {name} 庫存不足")

        order.items.append(OrderItem(
            order_id=order.id,
            product_id=sku.product_id,
            sku_id=sku.id,
            quantity=item_data.quantity,
            price=sku.price,
        ))
        sku.reserved = (sku.reserved or 0) + item_data.quantity

    # 3) 折扣（可選）+ 重算
    if data.discount is not None:
        if data.discount < 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="折扣不可為負數")
        order.discount = data.discount
    recompute_totals(order)

    after_items = [
        {"sku_id": i.sku_id, "quantity": i.quantity, "price": i.price}
        for i in order.items
    ]
    log_action(
        db, admin, "ORDER_ITEMS_UPDATE", "order", order.id,
        summary=f"調整訂單 #{order.id} 品項（{len(before_items)} → {len(after_items)} 項），小計 {order.subtotal:.0f}、折扣 {order.discount:.0f}",
        before={"items": before_items},
        after={"items": after_items, "subtotal": order.subtotal, "discount": order.discount},
    )
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/verify", response_model=OrderResponse)
def verify_order(
    order_id: str,
    data: VerifyOrder,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """管理員核對完成：輸入運費、鎖定金額。

    一般付款：等待核對 → 等待付款（48h 倒數）
    月結核准：等待核對 → 準備出貨（視同已付款，立即實扣庫存）
    """
    order = _get_order_or_404(db, order_id)
    if OrderStatus(order.status) != OrderStatus.PENDING_REVIEW:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="僅能在「等待核對」階段核對完成")
    if data.shipping_fee < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="運費不可為負數")

    if data.discount < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="折扣不可為負數")

    old_fee = order.shipping_fee
    old_discount = order.discount
    order.shipping_fee = data.shipping_fee
    order.discount = data.discount
    recompute_totals(order)  # total = subtotal + shipping_fee
    order.locked = True
    order.payment_type = data.payment_type.value

    if data.payment_type == PaymentType.MONTHLY:
        # 月結：跳過付款流程，直接實扣庫存進入準備出貨
        commit_stock(db, order)
        order.status = OrderStatus.PREPARING.value
        log_action(
            db, admin, "ORDER_VERIFY", "order", order.id,
            summary=f"月結核准 #{order.id}：運費 {data.shipping_fee:.0f}、折扣 {data.discount:.0f}、總額 {order.total_amount:.0f}，視同已付款並進入準備出貨",
            before={"status": "pending_review", "shipping_fee": old_fee, "discount": old_discount},
            after={"status": "preparing", "payment_type": "monthly", "shipping_fee": data.shipping_fee,
                   "discount": data.discount, "total_amount": order.total_amount},
        )
    else:
        order.status = OrderStatus.PENDING_PAYMENT.value
        # 進入等待付款：開始 48 小時倒數
        order.payment_deadline = datetime.utcnow() + timedelta(hours=settings.PAYMENT_DEADLINE_HOURS)
        log_action(
            db, admin, "ORDER_VERIFY", "order", order.id,
            summary=f"核對完成 #{order.id}：運費 {data.shipping_fee:.0f}、折扣 {data.discount:.0f}、總額 {order.total_amount:.0f}，進入等待付款",
            before={"status": "pending_review", "shipping_fee": old_fee, "discount": old_discount},
            after={"status": "pending_payment", "shipping_fee": data.shipping_fee,
                   "discount": data.discount, "total_amount": order.total_amount},
        )
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}/status", response_model=OrderResponse)
def change_status(
    order_id: str,
    data: StatusChange,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """管理員變更訂單狀態（僅允許合法轉換）"""
    order = _get_order_or_404(db, order_id)
    current = OrderStatus(order.status)
    target = data.status

    if current == target:
        return order

    # 核對完成須經 /verify（輸入運費），不走一般狀態轉換
    if current == OrderStatus.PENDING_REVIEW and target == OrderStatus.PENDING_PAYMENT:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="請使用「核對完成」並輸入運費",
        )

    if not can_transition(current, target):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"不允許的狀態轉換：{current.value} → {target.value}",
        )

    # 依轉換套用庫存帳務（實扣 / 釋放保留 / 退回庫存）
    apply_inventory_on_transition(db, order, current, target)

    order.status = target.value
    log_action(
        db, admin, "ORDER_STATUS_CHANGE", "order", order.id,
        summary=f"訂單 #{order.id} 狀態：{current.value} → {target.value}",
        before={"status": current.value}, after={"status": target.value},
    )
    db.commit()
    db.refresh(order)
    return order
