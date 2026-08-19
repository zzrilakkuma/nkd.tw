from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    saved_address = Column(JSON, nullable=True)

    # P0 帳號管控
    must_change_password = Column(Boolean, default=False, nullable=False)  # 首次登入強制改密
    is_active = Column(Boolean, default=True, nullable=False)              # 停用帳號
    company_name = Column(String, nullable=True)                          # 公司名稱
    contact_name = Column(String, nullable=True)                          # 聯絡人
    contact_phone = Column(String, nullable=True)                         # 聯絡電話
    tax_id = Column(String, nullable=True)                                # 統一編號

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="user")
