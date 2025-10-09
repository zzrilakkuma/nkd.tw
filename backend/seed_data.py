"""資料庫種子資料"""
import uuid
from app.core.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.core.security import get_password_hash

def seed_users(db):
    """建立使用者種子資料"""
    users = [
        User(
            id=str(uuid.uuid4()),
            email="admin@hookah-store.com",
            username="admin",
            hashed_password=get_password_hash("password"),
            is_admin=True
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer@gmail.com",
            username="customer",
            hashed_password=get_password_hash("password"),
            is_admin=False
        )
    ]

    for user in users:
        # 檢查是否已存在
        existing = db.query(User).filter(User.email == user.email).first()
        if not existing:
            db.add(user)
            print(f"✅ 建立使用者: {user.email}")
        else:
            print(f"⏭️  使用者已存在: {user.email}")

def seed_products(db):
    """建立商品種子資料"""
    products = [
        # DarkSide 系列水煙草 (100g裝，760元)
        Product(
            id="1",
            name="DarkSide Bergamonstr",
            description="佛手柑風味，清新柑橘香氣，德國頂級水煙草品牌，100g包裝",
            price=760,
            image="/images/keyvisual_DS-BERGAMONSTR_logo.jpg",
            stock=25,
            category="水煙草"
        ),
        Product(
            id="2",
            name="DarkSide Cosmo Flower",
            description="宇宙花朵風味，神秘花香調和，複合口感層次豐富，100g包裝",
            price=760,
            image="/images/keyvisual_DS-COSMO-FLOWER_logo.jpg",
            stock=30,
            category="水煙草"
        ),
        Product(
            id="3",
            name="DarkSide Dark Passion",
            description="黑色激情風味，濃郁果香，經典DarkSide招牌口味，100g包裝",
            price=760,
            image="/images/keyvisual_DS-DARK-PASSION_logo.jpg",
            stock=20,
            category="水煙草"
        ),
        Product(
            id="4",
            name="DarkSide Dark Supra",
            description="暗黑至尊風味，經典混合口味，適合老手的濃烈體驗，100g包裝",
            price=760,
            image="/images/keyvisual_DS-DARKSUPRA_logo.jpg",
            stock=35,
            category="水煙草"
        ),
        Product(
            id="5",
            name="DarkSide Lemon Blast",
            description="檸檬爆炸風味，強烈檸檬香氣，清新酸甜口感，100g包裝",
            price=760,
            image="/images/keyvisual_DS-LEMONBLAST.jpg",
            stock=40,
            category="水煙草"
        ),
        Product(
            id="6",
            name="DarkSide Needls",
            description="針葉風味，清新松針香氣，獨特森林系口味，100g包裝",
            price=760,
            image="/images/keyvisual_DS-NEEDLS.jpg",
            stock=22,
            category="水煙草"
        ),
        Product(
            id="7",
            name="DarkSide Pomelow",
            description="柚子風味，酸甜柚子香氣，清爽怡人，100g包裝",
            price=760,
            image="/images/keyvisual_DS-POMELOW_logo.jpg",
            stock=28,
            category="水煙草"
        ),
        Product(
            id="8",
            name="DarkSide Red Alert",
            description="紅色警報風味，濃烈漿果味，強勁口感體驗，100g包裝",
            price=760,
            image="/images/keyvisual_DS-RED-ALERT.jpg",
            stock=15,
            category="水煙草"
        ),
        Product(
            id="9",
            name="DarkSide Supernova",
            description="超新星風味，複合水果香氣，多層次口感享受，100g包裝",
            price=760,
            image="/images/keyvisual_DS-SUPERNOVA.jpg",
            stock=33,
            category="水煙草"
        ),
        Product(
            id="10",
            name="DarkSide Virgin Peach",
            description="處女桃風味，清甜蜜桃香氣，溫和順滑口感，100g包裝",
            price=760,
            image="/images/keyvisual_DS-VIRGIN-PEACH_no-logo_2.0.jpg",
            stock=38,
            category="水煙草"
        ),
        # Kalee 系列水煙草 (入門款)
        Product(
            id="11",
            name="Kalee Grapefruit",
            description="葡萄柚風味，入門友好的水煙草，酸甜清香，100g包裝",
            price=580,
            image="/images/KaleeGrapefruit_desktop_FINAL.jpg",
            stock=45,
            category="水煙草"
        ),
        # 配件類別
        Product(
            id="12",
            name="椰殼碳",
            description="天然椰殼製作，燃燒時間長，無異味，一箱10盒裝",
            price=2000,
            image="/images/placeholder.svg",
            stock=8,
            category="配件"
        ),
        Product(
            id="13",
            name="MOD 矽膠水煙管",
            description="食品級矽膠材質，易清潔且耐用，多色可選",
            price=650,
            image="/images/placeholder.svg",
            stock=12,
            category="配件"
        )
    ]

    for product in products:
        # 檢查是否已存在
        existing = db.query(Product).filter(Product.id == product.id).first()
        if not existing:
            db.add(product)
            print(f"✅ 建立商品: {product.name}")
        else:
            print(f"⏭️  商品已存在: {product.name}")

def seed_database():
    """執行資料庫種子"""
    db = SessionLocal()

    try:
        print("\n🌱 開始執行資料庫種子...")
        print("\n" + "="*50)
        print("建立使用者...")
        print("="*50)
        seed_users(db)

        print("\n" + "="*50)
        print("建立商品...")
        print("="*50)
        seed_products(db)

        db.commit()

        print("\n" + "="*50)
        print("✅ 資料庫種子執行完成！")
        print("="*50)

        # 顯示統計
        user_count = db.query(User).count()
        product_count = db.query(Product).count()
        print(f"\n📊 資料庫統計:")
        print(f"   使用者: {user_count} 個")
        print(f"   商品: {product_count} 個")

        print("\n🔐 測試帳號:")
        print("   管理員: admin@hookah-store.com / password")
        print("   一般用戶: customer@gmail.com / password")

    except Exception as e:
        print(f"\n❌ 錯誤: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
