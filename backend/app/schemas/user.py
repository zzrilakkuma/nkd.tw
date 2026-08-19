from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, Dict, Any, List


class UserBase(BaseModel):
    email: EmailStr
    username: str


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


class CompanyInfo(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None


class UserProfileUpdate(CompanyInfo):
    """客戶更新自己的公司聯絡資料與常用地址"""
    saved_address: Optional[List[SavedAddress]] = None


class PasswordChange(BaseModel):
    """客戶自行修改密碼"""
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("新密碼長度至少 6 碼")
        return v


# ---- 管理員帳號管理 ----

class AdminUserCreate(CompanyInfo):
    """管理員建立客戶帳號（回傳臨時密碼）"""
    email: EmailStr
    username: str
    is_admin: bool = False


class AdminUserUpdate(CompanyInfo):
    """管理員更新客戶帳號資料 / 啟用停用"""
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    is_admin: bool
    is_active: bool
    must_change_password: bool
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    tax_id: Optional[str] = None
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


class AdminUserCreatedResponse(BaseModel):
    """建立/重設帳號後回傳，包含一次性臨時密碼供管理員轉交客戶"""
    user: UserResponse
    temp_password: str
