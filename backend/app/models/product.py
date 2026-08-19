from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    brand_id = Column(String, ForeignKey("brands.id"), nullable=True, index=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True, index=True)
    main_image = Column(String)          # 主要圖片
    images = Column(JSON)                 # 輔助圖片，最多 5 張
    is_published = Column(Boolean, default=True, nullable=False)  # 上下架
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    brand = relationship("Brand")
    category = relationship("Category")
    skus = relationship(
        "SKU", back_populates="product", cascade="all, delete-orphan"
    )


class SKU(Base):
    __tablename__ = "skus"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    flavor = Column(String)               # 口味
    spec = Column(String)                 # 規格
    unit = Column(String)                 # 單位
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)      # 實體庫存
    reserved = Column(Integer, default=0, nullable=False)   # 保留量（P5 使用）
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    product = relationship("Product", back_populates="skus")

    @property
    def available(self) -> int:
        """可購買數量 = 實體庫存 - 保留量"""
        return (self.stock or 0) - (self.reserved or 0)
