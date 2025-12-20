#!/bin/bash

echo "🚀 Starting Hookah Store API..."

# 等待數據庫就緒
echo "⏳ Waiting for database to be ready..."
sleep 2

# 運行數據庫初始化（創建表）
echo "📊 Initializing database tables..."
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine); print('✅ Tables created')"

# 運行種子資料（如果表是空的）
echo "🌱 Seeding database..."
python seed_data.py

# 啟動 FastAPI 應用
echo "✨ Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
