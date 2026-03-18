from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "Hookah Store API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS - 支援逗號分隔的多個 origin，例如 "https://nkd.tw,https://www.nkd.tw"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    @property
    def allowed_origins(self) -> list:
        origins = [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]
        # 開發環境永遠加入 localhost
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

    def validate_required_settings(self):
        """驗證必需的環境變數"""
        errors = []

        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is required")

        if not self.SECRET_KEY:
            errors.append("SECRET_KEY is required")

        if errors:
            error_msg = "Missing required environment variables:\n" + "\n".join(f"  - {e}" for e in errors)
            raise ValueError(error_msg)


settings = Settings()

# 注意：不在模塊加載時驗證配置，而是在應用啟動時驗證
# 這樣可以避免在 Docker 構建階段因缺少環境變數而失敗
