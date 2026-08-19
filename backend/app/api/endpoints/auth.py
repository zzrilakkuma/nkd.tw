from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.user import (
    UserLogin,
    Token,
    UserResponse,
    UserProfileUpdate,
    PasswordChange,
)
from app.api.dependencies import get_current_user

router = APIRouter()


# 註：Phase 1 不開放公開註冊。帳號一律由管理員於後台建立（見 /admin/users）。


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """使用者登入"""
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email 或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此帳號已被停用，請聯絡管理員",
        )

    # 建立 access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """取得當前使用者資訊"""
    return UserResponse.model_validate(current_user)


@router.put("/password", response_model=UserResponse)
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """客戶自行修改密碼（首次登入後解除強制改密）"""
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前密碼錯誤",
        )

    if data.new_password == data.old_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密碼不可與目前密碼相同",
        )

    current_user.hashed_password = get_password_hash(data.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新使用者個人資料（公司聯絡資料與常用地址）"""
    data = profile_data.model_dump(exclude_unset=True)

    if "saved_address" in data and data["saved_address"] is not None:
        current_user.saved_address = [
            a.model_dump() for a in profile_data.saved_address
        ]
        data.pop("saved_address")

    # 公司聯絡資料
    for field in ("company_name", "contact_name", "contact_phone", "tax_id"):
        if field in data:
            setattr(current_user, field, data[field])

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
