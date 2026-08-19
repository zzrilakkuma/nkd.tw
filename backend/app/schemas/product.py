from pydantic import BaseModel
from typing import Optional, List


# ---------- Brand ----------
class BrandBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class BrandResponse(BrandBase):
    id: str

    class Config:
        from_attributes = True


# ---------- Category ----------
class CategoryBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: str

    class Config:
        from_attributes = True


# ---------- SKU ----------
class SKUBase(BaseModel):
    flavor: Optional[str] = None
    spec: Optional[str] = None
    unit: Optional[str] = None
    price: float
    stock: int = 0
    is_active: bool = True


class SKUCreate(SKUBase):
    pass


class SKUUpdate(BaseModel):
    flavor: Optional[str] = None
    spec: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None


class SKUResponse(SKUBase):
    id: str
    product_id: str
    reserved: int
    available: int

    class Config:
        from_attributes = True


# ---------- Product ----------
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    brand_id: Optional[str] = None
    category_id: Optional[str] = None
    main_image: Optional[str] = None
    images: Optional[List[str]] = None
    is_published: bool = True


class ProductCreate(ProductBase):
    # 建立商品時可一併帶入 SKU（至少一個）
    skus: Optional[List[SKUCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand_id: Optional[str] = None
    category_id: Optional[str] = None
    main_image: Optional[str] = None
    images: Optional[List[str]] = None
    is_published: Optional[bool] = None


class ProductResponse(ProductBase):
    id: str
    brand: Optional[BrandResponse] = None
    category: Optional[CategoryResponse] = None
    skus: List[SKUResponse] = []

    class Config:
        from_attributes = True
