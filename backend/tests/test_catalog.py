"""P1 商品目錄：品牌/類別/商品/SKU CRUD、上下架、可售數量。"""
from tests.conftest import get_sku


class TestBrandCategory:
    def test_brand_crud(self, client, admin_headers):
        res = client.post("/api/v1/brands", headers=admin_headers, json={"name": "DarkSide"})
        assert res.status_code == 201
        bid = res.json()["id"]

        assert any(b["id"] == bid for b in client.get("/api/v1/brands").json())

        res = client.put(f"/api/v1/brands/{bid}", headers=admin_headers, json={"name": "DarkSide TW"})
        assert res.json()["name"] == "DarkSide TW"

        assert client.delete(f"/api/v1/brands/{bid}", headers=admin_headers).status_code == 200
        assert not any(b["id"] == bid for b in client.get("/api/v1/brands").json())

    def test_category_crud(self, client, admin_headers):
        res = client.post("/api/v1/categories", headers=admin_headers, json={"name": "水煙草"})
        assert res.status_code == 201
        assert client.delete(f"/api/v1/categories/{res.json()['id']}", headers=admin_headers).status_code == 200

    def test_taxonomy_requires_admin(self, client, user_headers):
        assert client.post("/api/v1/brands", headers=user_headers, json={"name": "x"}).status_code == 403


class TestProducts:
    def test_create_product_with_sku(self, make_product):
        product, sku = make_product(name="佛手柑", price=760, stock=25)
        assert product["name"] == "佛手柑"
        assert sku["price"] == 760
        assert sku["stock"] == 25
        assert sku["reserved"] == 0
        assert sku["available"] == 25

    def test_public_list_excludes_unpublished(self, client, admin_headers, make_product):
        product, _ = make_product(name="會下架的商品")
        client.put(f"/api/v1/products/{product['id']}", headers=admin_headers, json={"is_published": False})

        public_ids = [p["id"] for p in client.get("/api/v1/products").json()]
        assert product["id"] not in public_ids

        admin_ids = [p["id"] for p in client.get("/api/v1/products/admin/all", headers=admin_headers).json()]
        assert product["id"] in admin_ids

    def test_sku_crud(self, client, admin_headers, make_product):
        product, _ = make_product()
        pid = product["id"]

        res = client.post(f"/api/v1/products/{pid}/skus", headers=admin_headers, json={
            "flavor": "檸檬", "spec": "250g", "unit": "件", "price": 1500, "stock": 8,
        })
        assert res.status_code == 201
        sid = res.json()["id"]

        res = client.put(f"/api/v1/products/{pid}/skus/{sid}", headers=admin_headers, json={"price": 1400})
        assert res.json()["price"] == 1400

        assert client.delete(f"/api/v1/products/{pid}/skus/{sid}", headers=admin_headers).status_code == 200

    def test_product_write_requires_admin(self, client, user_headers):
        res = client.post("/api/v1/products", headers=user_headers, json={"name": "x", "skus": []})
        assert res.status_code == 403

    def test_available_reflects_reservation(self, client, make_product, make_order):
        product, sku = make_product(stock=10)
        make_order(sku["id"], quantity=3)
        fresh = get_sku(client, product["id"], sku["id"])
        assert fresh["stock"] == 10        # 實體庫存不動
        assert fresh["reserved"] == 3      # 保留 3
        assert fresh["available"] == 7     # 可售 = 10 - 3
