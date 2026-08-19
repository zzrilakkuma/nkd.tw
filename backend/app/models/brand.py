from sqlalchemy import Column, String, Integer, Boolean
from app.core.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
