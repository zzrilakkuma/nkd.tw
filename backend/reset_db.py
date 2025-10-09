"""重置資料庫（刪除並重建）"""
from app.core.database import engine, Base

print("⚠️  警告: 這將刪除所有資料庫資料！")
response = input("確定要繼續嗎？(yes/no): ")

if response.lower() == 'yes':
    print("\n🗑️  刪除所有表格...")
    Base.metadata.drop_all(bind=engine)

    print("🔨 重新建立表格...")
    Base.metadata.create_all(bind=engine)

    print("✅ 資料庫重置完成！")
    print("\n💡 執行 'python seed_data.py' 來填充資料")
else:
    print("❌ 操作已取消")
