from pydantic import BaseModel
from typing import Optional


class PickupLocationBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None
    note: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class PickupLocationCreate(PickupLocationBase):
    pass


class PickupLocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    note: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class PickupLocationResponse(PickupLocationBase):
    id: str

    class Config:
        from_attributes = True
