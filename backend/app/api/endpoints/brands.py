from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.models.brand import Brand
from app.models.user import User
from app.schemas.product import BrandCreate, BrandUpdate, BrandResponse
from app.api.dependencies import get_current_admin_user

router = APIRouter()


@router.get("", response_model=List[BrandResponse])
def list_brands(db: Session = Depends(get_db)):
    return db.query(Brand).order_by(Brand.sort_order, Brand.name).all()


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    brand = Brand(id=str(uuid.uuid4()), **data.model_dump())
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: str,
    data: BrandUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="品牌不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="品牌不存在")
    db.delete(brand)
    db.commit()
    return {"message": "品牌已刪除"}
