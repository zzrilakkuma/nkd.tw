from sqlalchemy import Column, String, Integer, DateTime, JSON
from datetime import datetime
from app.core.database import Base


class AuditLog(Base):
    """操作紀錄：重要操作的前後內容與操作者（保留 3 個月）。"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String, nullable=True, index=True)     # 操作者 user id
    actor_name = Column(String, nullable=True)               # 操作者名稱（快照）
    action = Column(String, nullable=False, index=True)      # 動作代碼，如 ORDER_STATUS_CHANGE
    target_type = Column(String, nullable=False, index=True) # user / product / sku / order
    target_id = Column(String, nullable=True, index=True)
    summary = Column(String, nullable=True)                  # 人類可讀摘要
    before = Column(JSON, nullable=True)                     # 異動前內容
    after = Column(JSON, nullable=True)                      # 異動後內容
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
