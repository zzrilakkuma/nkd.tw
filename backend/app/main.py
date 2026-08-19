import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.api.router import api_router
from app.core.database import Base, engine, SessionLocal

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc"
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """應用啟動時執行"""
    # 驗證必要的環境變數
    try:
        settings.validate_required_settings()
        print("✅ Environment variables validated successfully")
    except ValueError as e:
        print(f"\n❌ Configuration Error:\n{e}\n")
        print("Please set the required environment variables in Zeabur:")
        print("  1. DATABASE_URL")
        print("  2. SECRET_KEY")
        print("  3. FRONTEND_URL (optional)\n")
        raise

    # 檢查數據庫引擎
    if engine is None:
        print("❌ Database engine not initialized. Please check DATABASE_URL.")
        raise RuntimeError("Database engine not initialized")

    # 自動補齊缺少的欄位（安全，可重複執行）
    try:
        with engine.connect() as conn:
            db_url = settings.DATABASE_URL
            if "postgresql" in db_url:
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_address JSON"
                ))
            else:
                # SQLite 不支援 IF NOT EXISTS，先查再加
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                if "saved_address" not in columns:
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN saved_address TEXT"
                    ))
            conn.commit()
        print("✅ Database schema migration completed")
    except Exception as e:
        print(f"⚠️ Migration warning (may be safe to ignore): {e}")

    # P5：背景排程 — 定期將逾期未付款訂單標記為已逾期並釋放保留庫存
    # P6：同時清理超過保留期限（3 個月）的操作紀錄
    async def expiry_sweeper():
        from app.services.order_expiry import expire_overdue_orders
        from app.services.audit import cleanup_old_logs
        while True:
            try:
                if SessionLocal is not None:
                    db = SessionLocal()
                    try:
                        count = expire_overdue_orders(db)
                        if count:
                            print(f"⌛ 已將 {count} 筆逾期未付款訂單標記為已逾期並釋放庫存")
                        removed = cleanup_old_logs(db)
                        if removed:
                            print(f"🧹 已清理 {removed} 筆逾 3 個月的操作紀錄")
                    finally:
                        db.close()
            except Exception as e:
                print(f"⚠️ 逾期掃描失敗（下次再試）: {e}")
            await asyncio.sleep(settings.EXPIRY_SWEEP_INTERVAL_SECONDS)

    asyncio.create_task(expiry_sweeper())
    print(f"⏲️  逾期掃描已啟動（每 {settings.EXPIRY_SWEEP_INTERVAL_SECONDS} 秒；付款期限 {settings.PAYMENT_DEADLINE_HOURS} 小時）")

    print("✅ Application started successfully")


@app.get("/")
def root():
    return {
        "message": "Hookah Store API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
