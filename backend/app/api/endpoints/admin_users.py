from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.core.security import get_password_hash, generate_temp_password
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.schemas.user import (
    AdminUserCreate,
    AdminUserUpdate,
    UserResponse,
    AdminUserCreatedResponse,
    CustomerSummary,
    CustomerDetail,
    CustomerOrderBrief,
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


def _customer_stats(orders: List[Order]) -> dict:
    completed = [o for o in orders if o.status == OrderStatus.COMPLETED.value]
    return {
        "order_count": len(orders),
        "completed_count": len(completed),
        "completed_total": sum(o.total_amount or 0 for o in completed),
        "last_order_at": max((o.created_at for o in orders), default=None),
    }


@router.get("/customers", response_model=List[CustomerSummary])
def list_customers(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """客戶檔案列表 (管理員)：所有非管理員帳號 + 訂單統計，可用 q 搜尋"""
    query = db.query(User).filter(User.is_admin.is_(False))
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            User.username.ilike(like)
            | User.email.ilike(like)
            | User.company_name.ilike(like)
            | User.contact_name.ilike(like)
            | User.contact_phone.ilike(like)
            | User.tax_id.ilike(like)
        )
    users = query.order_by(User.created_at.desc()).all()

    orders_by_user: dict = {}
    if users:
        for o in db.query(Order).filter(Order.user_id.in_([u.id for u in users])).all():
            orders_by_user.setdefault(o.user_id, []).append(o)

    return [
        CustomerSummary(
            **UserResponse.model_validate(u).model_dump(),
            **_customer_stats(orders_by_user.get(u.id, [])),
        )
        for u in users
    ]


@router.get("/{user_id}", response_model=CustomerDetail)
def get_customer(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """單一客戶檔案 (管理員)：帳號資料、常用地址、統計與歷史訂單"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="帳號不存在")
    orders = (
        db.query(Order).filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc()).all()
    )
    return CustomerDetail(
        **UserResponse.model_validate(user).model_dump(),
        **_customer_stats(orders),
        orders=[CustomerOrderBrief.model_validate(o) for o in orders],
    )


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

    # email / 帳號名稱不可為 null，且不可與他人重複
    for field in ("email", "username", "is_active"):
        if field in update and update[field] is None:
            update.pop(field)
    if "email" in update and update["email"] != user.email:
        if db.query(User).filter(User.email == update["email"], User.id != user.id).first():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Email 已被使用")
    if "username" in update and update["username"] != user.username:
        if db.query(User).filter(User.username == update["username"], User.id != user.id).first():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="使用者名稱已被使用")

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
