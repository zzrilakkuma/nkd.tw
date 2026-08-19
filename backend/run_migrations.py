"""執行資料庫 migration（相容既有以 create_all 建立的資料庫）。

流程：
1. 若資料庫尚無 alembic_version，但已存在 users 資料表
   （代表是導入 Alembic 前、由 create_all 建立的既有庫）
   → 先以 `stamp 0001_baseline` 標記，避免重跑建表。
2. 一律 `upgrade head`，套用後續 migration。
"""
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.database import engine


def main() -> None:
    if engine is None:
        raise RuntimeError("DATABASE_URL 未設定，無法執行 migration")

    cfg = Config("alembic.ini")

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "alembic_version" not in tables and "users" in tables:
        print("🔖 偵測到既有資料庫，標記為 baseline (0001_baseline)")
        command.stamp(cfg, "0001_baseline")

    print("⬆️  執行 alembic upgrade head ...")
    command.upgrade(cfg, "head")
    print("✅ Migration 完成")


if __name__ == "__main__":
    main()
