from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 延遲創建引擎，僅在 DATABASE_URL 存在時才創建
# 這樣可以避免在 Docker 構建階段因缺少環境變數而失敗
if settings.DATABASE_URL:
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    # 如果沒有 DATABASE_URL，創建一個空引擎（僅用於導入階段）
    engine = None
    SessionLocal = None

Base = declarative_base()


def get_db():
    """取得資料庫 session"""
    if SessionLocal is None:
        raise RuntimeError("Database not configured. Please set DATABASE_URL environment variable.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
