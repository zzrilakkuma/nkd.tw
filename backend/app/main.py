from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.api.router import api_router
from app.core.database import Base, engine

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
