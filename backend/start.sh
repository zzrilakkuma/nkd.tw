#!/bin/bash

echo "🚀 Starting Hookah Store API..."

# 等待數據庫就緒
echo "⏳ Waiting for database to be ready..."
sleep 2

# 執行資料庫 migration（Alembic；相容既有 create_all 建立的資料庫）
echo "📊 Running database migrations..."
python run_migrations.py

# 運行種子資料（如果表是空的）
echo "🌱 Seeding database..."
python seed_data.py

# 啟動 FastAPI 應用
echo "✨ Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
