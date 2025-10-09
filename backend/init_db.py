"""初始化資料庫"""
from app.core.database import engine, Base

# 建立所有資料表
print("🔨 建立資料庫表格...")
Base.metadata.create_all(bind=engine)
print("✅ 資料庫表格建立完成！")
print("\n💡 執行 'python seed_data.py' 來填充資料")
