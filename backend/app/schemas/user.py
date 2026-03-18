from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, Dict, Any, List


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SavedAddress(BaseModel):
    id: Optional[str] = None
    label: Optional[str] = None
    name: str
    phone: str
    postalCode: str
    city: str
    address: str


class UserProfileUpdate(BaseModel):
    saved_address: Optional[List[SavedAddress]] = None


class UserResponse(UserBase):
    id: str
    is_admin: bool
    saved_address: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    @field_validator('saved_address', mode='before')
    @classmethod
    def ensure_list(cls, v):
        if isinstance(v, dict):
            return [v]
        return v

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
