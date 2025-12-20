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

# 在啟動時驗證配置
try:
    settings.validate_required_settings()
except ValueError as e:
    print(f"\n❌ Configuration Error:\n{e}\n")
    print("Please set the required environment variables in Zeabur:")
    print("  1. DATABASE_URL")
    print("  2. SECRET_KEY")
    print("  3. FRONTEND_URL (optional)\n")
    raise
