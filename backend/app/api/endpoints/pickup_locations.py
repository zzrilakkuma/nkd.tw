from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.models.pickup_location import PickupLocation
from app.models.user import User
from app.schemas.pickup_location import (
    PickupLocationCreate,
    PickupLocationUpdate,
    PickupLocationResponse,
)
from app.api.dependencies import get_current_admin_user

router = APIRouter()


@router.get("", response_model=List[PickupLocationResponse])
def list_pickup_locations(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    """自取地點列表（active_only=true 僅回啟用中，供結帳使用）"""
    query = db.query(PickupLocation)
    if active_only:
        query = query.filter(PickupLocation.is_active == True)  # noqa: E712
    return query.order_by(PickupLocation.sort_order, PickupLocation.name).all()


@router.post("", response_model=PickupLocationResponse, status_code=status.HTTP_201_CREATED)
def create_pickup_location(
    data: PickupLocationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    loc = PickupLocation(id=str(uuid.uuid4()), **data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{loc_id}", response_model=PickupLocationResponse)
def update_pickup_location(
    loc_id: str,
    data: PickupLocationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    loc = db.query(PickupLocation).filter(PickupLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="自取地點不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}")
def delete_pickup_location(
    loc_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    loc = db.query(PickupLocation).filter(PickupLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="自取地點不存在")
    db.delete(loc)
    db.commit()
    return {"message": "自取地點已刪除"}
