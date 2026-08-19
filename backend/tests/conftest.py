"""測試共用設定。

重要：必須在匯入任何 app 模組前強制覆寫環境變數，
確保測試永遠使用獨立的 SQLite 測試庫，不會動到開發/正式資料。
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_suite.db"   # 強制覆寫，避免誤連開發庫
os.environ["SECRET_KEY"] = "test-secret"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

import uuid  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine, SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402

ADMIN_EMAIL = "admin@test.com"
CUSTOMER_EMAIL = "customer@test.com"
PASSWORD = "testpass123"


@pytest.fixture(autouse=True)
def fresh_db():
    """每個測試都用乾淨的資料庫（建表 + 種子帳號）。"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add_all([
        User(
            id=str(uuid.uuid4()), email=ADMIN_EMAIL, username="admin",
            hashed_password=get_password_hash(PASSWORD),
            is_admin=True, is_active=True, must_change_password=False,
        ),
        User(
            id=str(uuid.uuid4()), email=CUSTOMER_EMAIL, username="customer",
            hashed_password=get_password_hash(PASSWORD),
            is_admin=False, is_active=True, must_change_password=False,
        ),
    ])
    db.commit()
    db.close()
    yield


@pytest.fixture
def client():
    # 不使用 with（不觸發 startup event，避免啟動背景排程）
    return TestClient(app)


def _login_headers(client: TestClient, email: str) -> dict:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def admin_headers(client):
    return _login_headers(client, ADMIN_EMAIL)


@pytest.fixture
def user_headers(client):
    return _login_headers(client, CUSTOMER_EMAIL)


@pytest.fixture
def make_product(client, admin_headers):
    """工廠：建立含一個 SKU 的商品，回傳 (product, sku)。"""
    def _make(name="測試商品", price=500.0, stock=10, **sku_extra):
        res = client.post("/api/v1/products", headers=admin_headers, json={
            "name": name,
            "description": "測試用",
            "is_published": True,
            "skus": [{"flavor": "", "spec": "", "unit": "件",
                      "price": price, "stock": stock, "is_active": True, **sku_extra}],
        })
        assert res.status_code == 201, res.text
        product = res.json()
        return product, product["skus"][0]
    return _make


HOME_SHIPPING = {
    "name": "測試客", "phone": "0912345678",
    "city": "台北市", "postalCode": "100", "address": "測試路 1 號",
}


@pytest.fixture
def make_order(client, user_headers):
    """工廠：客戶建立宅配訂單，回傳 order dict。"""
    def _make(sku_id: str, quantity: int = 1, method: str = "home_delivery", shipping=None):
        res = client.post("/api/v1/orders/", headers=user_headers, json={
            "items": [{"sku_id": sku_id, "quantity": quantity}],
            "delivery_method": method,
            "shipping_info": shipping if shipping is not None else HOME_SHIPPING,
        })
        assert res.status_code == 200, res.text
        return res.json()
    return _make


def get_sku(client, product_id: str, sku_id: str) -> dict:
    p = client.get(f"/api/v1/products/{product_id}").json()
    return next(s for s in p["skus"] if s["id"] == sku_id)
