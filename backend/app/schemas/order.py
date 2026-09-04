from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.order import OrderStatus, DeliveryMethod, PaymentType


class OrderItemCreate(BaseModel):
    sku_id: str
    quantity: int


class ProductInOrder(BaseModel):
    id: str
    name: str
    main_image: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SKUInOrder(BaseModel):
    id: str
    flavor: Optional[str] = None
    spec: Optional[str] = None
    unit: Optional[str] = None

    class Config:
        from_attributes = True


class OrderItemResponse(BaseModel):
    id: int
    product_id: str
    sku_id: Optional[str] = None
    quantity: int
    price: float
    product: Optional[ProductInOrder] = None
    sku: Optional[SKUInOrder] = None

    class Config:
        from_attributes = True


class InvoiceInfo(BaseModel):
    """發票資訊（選填）"""
    tax_id: str
    company_name: str


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    delivery_method: DeliveryMethod
    # 依配送方式帶不同欄位（宅配 / 7-11 / 自取），由後端依方式驗證必填
    shipping_info: Dict[str, Any]
    invoice: Optional[InvoiceInfo] = None


class StatusChange(BaseModel):
    """管理員變更訂單狀態（後端驗證是否為合法轉換）"""
    status: OrderStatus


class VerifyOrder(BaseModel):
    """管理員核對完成：輸入運費（可含折扣）並鎖定金額。

    payment_type=normal：進入等待付款（48h 倒數）
    payment_type=monthly：月結核准，視同已付款，直接進入準備出貨並實扣庫存
    """
    shipping_fee: float
    discount: float = 0
    payment_type: PaymentType = PaymentType.NORMAL


class UpdateOrderItems(BaseModel):
    """管理員於等待核對階段調整品項/數量"""
    items: List[OrderItemCreate]
    discount: Optional[float] = None


class PaymentSubmit(BaseModel):
    """客戶提交付款：轉帳帳號末五碼"""
    last5Digits: str


class OrderResponse(BaseModel):
    id: str
    user_id: str
    status: OrderStatus
    payment_type: PaymentType = PaymentType.NORMAL
    delivery_method: Optional[DeliveryMethod] = None
    subtotal: float
    discount: float
    invoice: Optional[Dict[str, Any]] = None
    shipping_fee: float
    total_amount: float
    locked: bool
    paid_at: Optional[datetime] = None
    payment_deadline: Optional[datetime] = None
    shipping_info: Dict[str, Any]
    payment_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True
