from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int


class OrderItemResponse(BaseModel):
    id: int
    product_id: str
    quantity: int
    price: float

    class Config:
        from_attributes = True


class ShippingInfo(BaseModel):
    name: str
    phone: str
    city: str
    postalCode: str
    address: str


class PaymentInfo(BaseModel):
    last5Digits: str
    completedAt: str


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_info: ShippingInfo
    total_amount: float


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_info: Optional[Dict[str, Any]] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    status: OrderStatus
    total_amount: float
    shipping_info: Dict[str, Any]
    payment_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True
