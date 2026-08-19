from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.api.dependencies import get_current_admin_user

router = APIRouter()


class AuditLogItem(BaseModel):
    id: int
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    summary: Optional[str] = None
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPage(BaseModel):
    total: int
    items: List[AuditLogItem]


@router.get("", response_model=AuditLogPage)
def list_audit_logs(
    target_type: Optional[str] = None,
    action: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """操作紀錄（管理員）：可依對象類型/動作篩選、搜尋摘要，新的在前。"""
    limit = max(1, min(limit, 200))
    query = db.query(AuditLog)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if q:
        like = f"%{q}%"
        query = query.filter(
            AuditLog.summary.ilike(like)
            | AuditLog.target_id.ilike(like)
            | AuditLog.actor_name.ilike(like)
        )
    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return AuditLogPage(total=total, items=items)
