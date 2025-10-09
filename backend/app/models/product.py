from sqlalchemy import Column, String, Float, Integer
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    image = Column(String)
    stock = Column(Integer, default=0)
    category = Column(String, nullable=False, index=True)
