from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    allow_origins=[settings.FRONTEND_URL],
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

    # 建立資料表
    if engine is None:
        print("❌ Database engine not initialized. Please check DATABASE_URL.")
        raise RuntimeError("Database engine not initialized")

    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        raise


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
