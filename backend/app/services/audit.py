"""操作紀錄服務：寫入與清理。

用法：在各端點完成資料異動後（commit 前）呼叫 log_action，
與業務資料同一交易寫入。
"""
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User

# 保留天數（需求：3 個月）
RETENTION_DAYS = 90


def log_action(
    db: Session,
    actor: Optional[User],
    action: str,
    target_type: str,
    target_id: Optional[str],
    summary: Optional[str] = None,
    before: Optional[Dict[str, Any]] = None,
    after: Optional[Dict[str, Any]] = None,
) -> None:
    db.add(AuditLog(
        actor_id=actor.id if actor else None,
        actor_name=actor.username if actor else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=summary,
        before=before or None,
        after=after or None,
    ))


def diff_fields(old: Dict[str, Any], new: Dict[str, Any]) -> tuple:
    """只保留有變更的欄位，回傳 (before, after)。"""
    before, after = {}, {}
    for key, new_val in new.items():
        old_val = old.get(key)
        if old_val != new_val:
            before[key] = old_val
            after[key] = new_val
    return before, after


def cleanup_old_logs(db: Session, days: int = RETENTION_DAYS) -> int:
    """刪除超過保留期限的紀錄，回傳刪除筆數。"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    count = db.query(AuditLog).filter(AuditLog.created_at < cutoff).delete()
    if count:
        db.commit()
    return count
