from sqlalchemy import Column, String, Integer, Boolean
from app.core.database import Base


class PickupLocation(Base):
    __tablename__ = "pickup_locations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)      # 地點名稱
    address = Column(String, nullable=True)     # 地址
    contact = Column(String, nullable=True)     # 聯絡方式
    note = Column(String, nullable=True)        # 備註
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
