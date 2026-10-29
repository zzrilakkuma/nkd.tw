"""資料庫種子資料"""
import uuid
from app.core.database import SessionLocal
from app.models.user import User
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product, SKU
from app.core.security import get_password_hash


def seed_users(db):
    """建立使用者種子資料"""
    users = [
        User(
            id=str(uuid.uuid4()),
            email="admin@hookah-store.com",
            username="admin",
            hashed_password=get_password_hash("password"),
            is_admin=True,
            is_active=True,
            must_change_password=False,
        ),
        User(
            id=str(uuid.uuid4()),
            email="customer@gmail.com",
            username="customer",
            hashed_password=get_password_hash("password"),
            is_admin=False,
            is_active=True,
            must_change_password=False,
        )
    ]

    for user in users:
        existing = db.query(User).filter(User.email == user.email).first()
        if not existing:
            db.add(user)
            print(f"✅ 建立使用者: {user.email}")
        else:
            print(f"⏭️  使用者已存在: {user.email}")


def _get_or_create_brand(db, name, sort_order=0):
    brand = db.query(Brand).filter(Brand.name == name).first()
    if not brand:
        brand = Brand(id=str(uuid.uuid4()), name=name, sort_order=sort_order, is_active=True)
        db.add(brand)
        db.flush()
    return brand


def _get_or_create_category(db, name, sort_order=0):
    category = db.query(Category).filter(Category.name == name).first()
    if not category:
        category = Category(id=str(uuid.uuid4()), name=name, sort_order=sort_order, is_active=True)
        db.add(category)
        db.flush()
    return category


# (name, brand, category, description, price, image, stock)
PRODUCT_SEED = [
    ("椰殼碳", "未指定品牌", "配件", "天然椰殼製作，燃燒時間長，無異味，一箱10盒裝", 2000, "/images/placeholder.svg", 8),
    ("MOD 矽膠水煙管", "未指定品牌", "配件", "食品級矽膠材質，易清潔且耐用，多色可選", 650, "/images/placeholder.svg", 12),
]


def seed_products(db):
    """建立商品種子資料（品牌 / 類別 / 商品 / SKU）"""
    for name, brand_name, cat_name, desc, price, image, stock in PRODUCT_SEED:
        existing = db.query(Product).filter(Product.name == name).first()
        if existing:
            print(f"⏭️  商品已存在: {name}")
            continue

        brand = _get_or_create_brand(db, brand_name)
        category = _get_or_create_category(db, cat_name)

        product = Product(
            id=str(uuid.uuid4()),
            name=name,
            description=desc,
            brand_id=brand.id,
            category_id=category.id,
            main_image=image,
            images=[],
            is_published=True,
        )
        product.skus.append(
            SKU(
                id=str(uuid.uuid4()),
                flavor="",
                spec="",
                unit="件",
                price=price,
                stock=stock,
                reserved=0,
                is_active=True,
            )
        )
        db.add(product)
        print(f"✅ 建立商品: {name}（{brand_name} / {cat_name}）")


def seed_database():
    """執行資料庫種子"""
    db = SessionLocal()

    try:
        print("\n🌱 開始執行資料庫種子...")
        print("\n" + "=" * 50)
        print("建立使用者...")
        print("=" * 50)
        seed_users(db)

        print("\n" + "=" * 50)
        print("建立商品...")
        print("=" * 50)
        seed_products(db)

        db.commit()

        print("\n" + "=" * 50)
        print("✅ 資料庫種子執行完成！")
        print("=" * 50)

        user_count = db.query(User).count()
        brand_count = db.query(Brand).count()
        category_count = db.query(Category).count()
        product_count = db.query(Product).count()
        sku_count = db.query(SKU).count()
        print("\n📊 資料庫統計:")
        print(f"   使用者: {user_count} 個")
        print(f"   品牌: {brand_count} 個")
        print(f"   類別: {category_count} 個")
        print(f"   商品: {product_count} 個")
        print(f"   SKU: {sku_count} 個")

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
