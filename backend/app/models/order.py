from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"    # 等待管理員核對
    PENDING_PAYMENT = "pending_payment"  # 等待付款
    PENDING_CONFIRM = "pending_confirm"  # 等待入帳確認
    PREPARING = "preparing"              # 準備出貨
    COMPLETED = "completed"              # 已完成
    CANCELLED = "cancelled"              # 已取消
    EXPIRED = "expired"                  # 已逾期


class DeliveryMethod(str, enum.Enum):
    HOME_DELIVERY = "home_delivery"   # 黑貓宅配
    CVS_711 = "cvs_711"               # 7-ELEVEN 取貨
    SELF_PICKUP = "self_pickup"       # 自取


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # 以純字串儲存狀態（值為 OrderStatus.value），避免跨資料庫 enum 型別維護成本
    status = Column(String, default=OrderStatus.PENDING_REVIEW.value, nullable=False)
    delivery_method = Column(String, nullable=True)  # DeliveryMethod.value

    subtotal = Column(Float, nullable=False, default=0)       # 商品小計（後端計算）
    discount = Column(Float, nullable=False, default=0)       # 折扣金額（核對階段由管理員輸入）
    shipping_fee = Column(Float, nullable=False, default=0)   # 運費（P4 由管理員輸入）
    total_amount = Column(Float, nullable=False)              # = subtotal - discount + shipping_fee

    invoice = Column(JSON, nullable=True)                     # 發票資訊 {tax_id, company_name}（選填）

    locked = Column(Boolean, nullable=False, default=False)   # 核對完成後鎖定
    paid_at = Column(DateTime, nullable=True)                 # 客戶提交付款時間
    payment_deadline = Column(DateTime, nullable=True)        # 付款截止（P5：進待付款 +48h）

    shipping_info = Column(JSON, nullable=False)  # 配送資訊
    payment_info = Column(JSON)                   # 付款資訊（轉帳後五碼等）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)  # 保留供顯示/歷史
    sku_id = Column(String, ForeignKey("skus.id"), nullable=True)           # 實際購買的 SKU
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)  # 購買時的 SKU 單價

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    sku = relationship("SKU")
