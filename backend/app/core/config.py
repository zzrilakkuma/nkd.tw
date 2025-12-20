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

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
