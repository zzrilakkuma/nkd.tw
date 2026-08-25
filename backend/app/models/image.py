from sqlalchemy import Column, String, DateTime, LargeBinary, Integer
from datetime import datetime
from app.core.database import Base


class Image(Base):
    """商品圖片（存 DB，重新部署不會遺失；適合本專案的小規模圖量）。"""
    __tablename__ = "images"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    content_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False, default=0)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
