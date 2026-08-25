"""P2–P5 訂單流程：狀態機、配送、核對運費、庫存保留/實扣/釋放、48h 逾期。"""
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.order import Order
from app.services.order_expiry import expire_overdue_orders
from tests.conftest import get_sku, HOME_SHIPPING


def _set_deadline_past(order_id: str, minutes: int = 5):
    db = SessionLocal()
    order = db.query(Order).filter(Order.id == order_id).first()
    order.payment_deadline = datetime.utcnow() - timedelta(minutes=minutes)
    db.commit()
    db.close()


class TestCreateOrder:
    def test_create_computes_amount_and_reserves(self, client, make_product, make_order):
        product, sku = make_product(price=760, stock=25)
        order = make_order(sku["id"], quantity=2)

        assert order["status"] == "pending_review"
        assert order["subtotal"] == 1520          # 金額由後端計算
        assert order["shipping_fee"] == 100       # 宅配預設運費
        assert order["total_amount"] == 1620
        assert order["locked"] is False
        assert order["items"][0]["sku_id"] == sku["id"]

        fresh = get_sku(client, product["id"], sku["id"])
        assert (fresh["stock"], fresh["reserved"], fresh["available"]) == (25, 2, 23)

    def test_insufficient_stock_rejected(self, client, user_headers, make_product):
        _, sku = make_product(stock=1)
        res = client.post("/api/v1/orders/", headers=user_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 5}],
            "delivery_method": "home_delivery",
            "shipping_info": HOME_SHIPPING,
        })
        assert res.status_code == 400
        assert "庫存不足" in res.json()["detail"]

    def test_cvs_missing_fields_rejected(self, client, user_headers, make_product):
        _, sku = make_product()
        res = client.post("/api/v1/orders/", headers=user_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 1}],
            "delivery_method": "cvs_711",
            "shipping_info": {"name": "客", "phone": "0911"},  # 缺門市
        })
        assert res.status_code == 400

    def test_cvs_default_fee(self, make_product, make_order):
        _, sku = make_product(price=500)
        order = make_order(sku["id"], method="cvs_711", shipping={
            "name": "客", "phone": "0911", "store_name": "幸福門市", "store_code": "123456",
        })
        assert order["shipping_fee"] == 60
        assert order["shipping_info"]["store_name"] == "幸福門市"

    def test_self_pickup_snapshot_and_zero_fee(self, client, admin_headers, make_product, make_order):
        loc = client.post("/api/v1/pickup-locations", headers=admin_headers, json={
            "name": "台北門市", "address": "台北市 A 路 1 號",
        }).json()
        _, sku = make_product()
        order = make_order(sku["id"], method="self_pickup", shipping={
            "pickup_location_id": loc["id"], "name": "取件人", "phone": "0900",
        })
        assert order["shipping_fee"] == 0
        # 地點資訊快照進訂單
        assert order["shipping_info"]["location_name"] == "台北門市"
        assert order["shipping_info"]["address"] == "台北市 A 路 1 號"


class TestVerifyAndTransitions:
    def test_verify_sets_fee_deadline_and_locks(self, client, admin_headers, make_product, make_order):
        _, sku = make_product(price=760)
        order = make_order(sku["id"])

        res = client.post(f"/api/v1/orders/{order['id']}/verify", headers=admin_headers,
                          json={"shipping_fee": 120})
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "pending_payment"
        assert body["shipping_fee"] == 120
        assert body["total_amount"] == 880       # 760 + 120，鎖定
        assert body["locked"] is True
        assert body["payment_deadline"] is not None

    def test_review_to_payment_must_use_verify(self, client, admin_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        res = client.put(f"/api/v1/orders/{order['id']}/status", headers=admin_headers,
                         json={"status": "pending_payment"})
        assert res.status_code == 400

    def test_illegal_transition_rejected(self, client, admin_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        # 等待核對 → 準備出貨（跳關）不允許
        res = client.put(f"/api/v1/orders/{order['id']}/status", headers=admin_headers,
                         json={"status": "preparing"})
        assert res.status_code == 400

    def test_pay_only_in_pending_payment(self, client, user_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        res = client.post(f"/api/v1/orders/{order['id']}/pay", headers=user_headers,
                          json={"last5Digits": "12345"})
        assert res.status_code == 400

    def test_customer_cannot_change_status(self, client, user_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        res = client.put(f"/api/v1/orders/{order['id']}/status", headers=user_headers,
                         json={"status": "cancelled"})
        assert res.status_code == 403


class TestInventoryLedger:
    def test_full_flow_commits_stock(self, client, admin_headers, user_headers,
                                     make_product, make_order):
        product, sku = make_product(stock=10)
        order = make_order(sku["id"], quantity=3)
        oid = order["id"]

        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 0})
        res = client.post(f"/api/v1/orders/{oid}/pay", headers=user_headers,
                          json={"last5Digits": "54321"})
        assert res.json()["status"] == "pending_confirm"
        assert res.json()["payment_info"]["last5Digits"] == "54321"

        # 確認入帳 → 準備出貨：實扣
        client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "preparing"})
        fresh = get_sku(client, product["id"], sku["id"])
        assert (fresh["stock"], fresh["reserved"], fresh["available"]) == (7, 0, 7)

        # 完成後為終態
        client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "completed"})
        res = client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "cancelled"})
        assert res.status_code == 400

    def test_cancel_releases_reservation(self, client, user_headers, make_product, make_order):
        product, sku = make_product(stock=10)
        order = make_order(sku["id"], quantity=4)

        res = client.post(f"/api/v1/orders/{order['id']}/cancel", headers=user_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "cancelled"

        fresh = get_sku(client, product["id"], sku["id"])
        assert (fresh["stock"], fresh["reserved"], fresh["available"]) == (10, 0, 10)

    def test_cancel_after_preparing_returns_stock(self, client, admin_headers, user_headers,
                                                  make_product, make_order):
        product, sku = make_product(stock=10)
        order = make_order(sku["id"], quantity=3)
        oid = order["id"]

        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 0})
        client.post(f"/api/v1/orders/{oid}/pay", headers=user_headers, json={"last5Digits": "11111"})
        client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "preparing"})

        # 出貨前取消 → 貨退回實體庫存
        client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "cancelled"})
        fresh = get_sku(client, product["id"], sku["id"])
        assert (fresh["stock"], fresh["reserved"], fresh["available"]) == (10, 0, 10)

    def test_customer_cannot_cancel_after_payment(self, client, admin_headers, user_headers,
                                                  make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        oid = order["id"]
        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 0})
        client.post(f"/api/v1/orders/{oid}/pay", headers=user_headers, json={"last5Digits": "22222"})

        res = client.post(f"/api/v1/orders/{oid}/cancel", headers=user_headers)
        assert res.status_code == 400


class TestExpiry:
    def test_sweeper_expires_overdue_and_releases(self, client, admin_headers,
                                                  make_product, make_order):
        product, sku = make_product(stock=10)
        order = make_order(sku["id"], quantity=2)
        oid = order["id"]
        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 0})

        _set_deadline_past(oid)
        db = SessionLocal()
        count = expire_overdue_orders(db)
        db.close()
        assert count == 1

        assert client.get(f"/api/v1/orders/{oid}", headers=admin_headers).json()["status"] == "expired"
        fresh = get_sku(client, product["id"], sku["id"])
        assert (fresh["stock"], fresh["reserved"], fresh["available"]) == (10, 0, 10)

    def test_pay_after_deadline_blocked_and_marks_expired(self, client, admin_headers, user_headers,
                                                          make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        oid = order["id"]
        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 0})
        _set_deadline_past(oid)

        res = client.post(f"/api/v1/orders/{oid}/pay", headers=user_headers, json={"last5Digits": "33333"})
        assert res.status_code == 400
        assert client.get(f"/api/v1/orders/{oid}", headers=admin_headers).json()["status"] == "expired"


class TestV12InvoiceDiscountItems:
    def test_invoice_saved_on_order(self, client, user_headers, make_product):
        _, sku = make_product()
        res = client.post("/api/v1/orders/", headers=user_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 1}],
            "delivery_method": "home_delivery",
            "shipping_info": HOME_SHIPPING,
            "invoice": {"tax_id": "12345678", "company_name": "測試股份有限公司"},
        })
        assert res.status_code == 200
        assert res.json()["invoice"] == {"tax_id": "12345678", "company_name": "測試股份有限公司"}

    def test_invalid_tax_id_rejected(self, client, user_headers, make_product):
        _, sku = make_product()
        res = client.post("/api/v1/orders/", headers=user_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 1}],
            "delivery_method": "home_delivery",
            "shipping_info": HOME_SHIPPING,
            "invoice": {"tax_id": "123", "company_name": "測試"},
        })
        assert res.status_code == 400

    def test_admin_update_items_adjusts_reservation_and_subtotal(
        self, client, admin_headers, make_product, make_order
    ):
        p1, sku1 = make_product(name="商品A", price=100, stock=10)
        p2, sku2 = make_product(name="商品B", price=200, stock=10)
        order = make_order(sku1["id"], quantity=2)  # 保留 A×2

        # 改成 A×1 + B×3
        res = client.put(f"/api/v1/orders/{order['id']}/items", headers=admin_headers, json={
            "items": [
                {"sku_id": sku1["id"], "quantity": 1},
                {"sku_id": sku2["id"], "quantity": 3},
            ],
        })
        assert res.status_code == 200
        body = res.json()
        assert body["subtotal"] == 100 * 1 + 200 * 3
        assert len(body["items"]) == 2

        a = get_sku(client, p1["id"], sku1["id"])
        b = get_sku(client, p2["id"], sku2["id"])
        assert a["reserved"] == 1   # 2 → 1
        assert b["reserved"] == 3   # 0 → 3

    def test_update_items_insufficient_stock_rejected(self, client, admin_headers,
                                                      make_product, make_order):
        _, sku = make_product(stock=2)
        order = make_order(sku["id"], quantity=1)
        res = client.put(f"/api/v1/orders/{order['id']}/items", headers=admin_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 99}],
        })
        assert res.status_code == 400

    def test_update_items_only_in_review(self, client, admin_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        client.post(f"/api/v1/orders/{order['id']}/verify", headers=admin_headers,
                    json={"shipping_fee": 0})
        res = client.put(f"/api/v1/orders/{order['id']}/items", headers=admin_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 2}],
        })
        assert res.status_code == 400

    def test_verify_with_discount(self, client, admin_headers, make_product, make_order):
        _, sku = make_product(price=1000)
        order = make_order(sku["id"], quantity=2)  # 小計 2000
        res = client.post(f"/api/v1/orders/{order['id']}/verify", headers=admin_headers,
                          json={"shipping_fee": 100, "discount": 300})
        assert res.status_code == 200
        body = res.json()
        assert body["discount"] == 300
        assert body["total_amount"] == 2000 - 300 + 100  # 1800

    def test_customer_cannot_update_items(self, client, user_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        res = client.put(f"/api/v1/orders/{order['id']}/items", headers=user_headers, json={
            "items": [{"sku_id": sku["id"], "quantity": 5}],
        })
        assert res.status_code == 403
