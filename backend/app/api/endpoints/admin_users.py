from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.core.security import get_password_hash, generate_temp_password
from app.models.user import User
from app.schemas.user import (
    AdminUserCreate,
    AdminUserUpdate,
    UserResponse,
    AdminUserCreatedResponse,
)
from app.api.dependencies import get_current_admin_user
from app.services.audit import log_action, diff_fields

router = APIRouter()


@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """列出所有帳號 (管理員)"""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=AdminUserCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """管理員建立帳號，回傳一次性臨時密碼供轉交客戶"""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Email 已被使用")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="使用者名稱已被使用")

    temp_password = generate_temp_password()
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        username=data.username,
        hashed_password=get_password_hash(temp_password),
        is_admin=data.is_admin,
        is_active=True,
        must_change_password=True,
        company_name=data.company_name,
        contact_name=data.contact_name,
        contact_phone=data.contact_phone,
        tax_id=data.tax_id,
    )
    db.add(user)
    log_action(
        db, admin, "USER_CREATE", "user", user.id,
        summary=f"建立帳號 {user.username}（{user.email}）",
        after={"email": user.email, "username": user.username, "company_name": user.company_name},
    )
    db.commit()
    db.refresh(user)
    return AdminUserCreatedResponse(
        user=UserResponse.model_validate(user), temp_password=temp_password
    )


@router.post("/{user_id}/reset-password", response_model=AdminUserCreatedResponse)
def reset_password(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """管理員重設臨時密碼，回傳一次性臨時密碼"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="帳號不存在")

    temp_password = generate_temp_password()
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    log_action(
        db, admin, "USER_RESET_PASSWORD", "user", user.id,
        summary=f"重設 {user.username} 的臨時密碼",
    )
    db.commit()
    db.refresh(user)
    return AdminUserCreatedResponse(
        user=UserResponse.model_validate(user), temp_password=temp_password
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """管理員更新帳號資料 / 啟用停用"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="帳號不存在")

    update = data.model_dump(exclude_unset=True)

    # 避免管理員停用自己
    if update.get("is_active") is False and user.id == current_admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="無法停用自己的帳號")

    old = {f: getattr(user, f) for f in update}
    for field, value in update.items():
        setattr(user, field, value)

    before, after = diff_fields(old, update)
    if after:
        log_action(
            db, current_admin, "USER_UPDATE", "user", user.id,
            summary=f"更新帳號 {user.username}：" + "、".join(after.keys()),
            before=before, after=after,
        )
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
