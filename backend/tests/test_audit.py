"""P6 操作紀錄：留痕、前後差異、篩選、權限、3 個月清理。"""
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.audit_log import AuditLog
from app.services.audit import cleanup_old_logs


def _logs(client, admin_headers, **params):
    res = client.get("/api/v1/admin/audit-logs", headers=admin_headers, params=params)
    assert res.status_code == 200
    return res.json()


class TestAuditWrites:
    def test_user_create_logged(self, client, admin_headers):
        client.post("/api/v1/admin/users", headers=admin_headers, json={
            "email": "log1@x.com", "username": "log1",
        })
        logs = _logs(client, admin_headers, action="USER_CREATE")
        assert logs["total"] == 1
        assert "log1" in logs["items"][0]["summary"]
        assert logs["items"][0]["actor_name"] == "admin"

    def test_sku_price_change_logged_with_diff(self, client, admin_headers, make_product):
        product, sku = make_product(price=500, stock=10)
        client.put(f"/api/v1/products/{product['id']}/skus/{sku['id']}",
                   headers=admin_headers, json={"price": 550})

        logs = _logs(client, admin_headers, action="SKU_UPDATE")
        assert logs["total"] == 1
        item = logs["items"][0]
        assert item["before"] == {"price": 500.0}
        assert item["after"] == {"price": 550.0}

    def test_noop_update_not_logged(self, client, admin_headers, make_product):
        product, sku = make_product(price=500)
        # 值沒變 → 不留紀錄
        client.put(f"/api/v1/products/{product['id']}/skus/{sku['id']}",
                   headers=admin_headers, json={"price": 500})
        assert _logs(client, admin_headers, action="SKU_UPDATE")["total"] == 0

    def test_order_flow_logged(self, client, admin_headers, user_headers, make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        oid = order["id"]

        client.post(f"/api/v1/orders/{oid}/verify", headers=admin_headers, json={"shipping_fee": 80})
        client.post(f"/api/v1/orders/{oid}/pay", headers=user_headers, json={"last5Digits": "12345"})
        client.put(f"/api/v1/orders/{oid}/status", headers=admin_headers, json={"status": "preparing"})

        order_logs = _logs(client, admin_headers, target_type="order")
        actions = [x["action"] for x in order_logs["items"]]
        assert "ORDER_VERIFY" in actions
        assert "ORDER_STATUS_CHANGE" in actions

        verify_log = next(x for x in order_logs["items"] if x["action"] == "ORDER_VERIFY")
        assert verify_log["after"]["shipping_fee"] == 80

    def test_customer_cancel_logged_with_actor(self, client, admin_headers, user_headers,
                                               make_product, make_order):
        _, sku = make_product()
        order = make_order(sku["id"])
        client.post(f"/api/v1/orders/{order['id']}/cancel", headers=user_headers)

        logs = _logs(client, admin_headers, action="ORDER_CANCEL")
        assert logs["total"] == 1
        assert logs["items"][0]["actor_name"] == "customer"


class TestAuditQuery:
    def test_filter_and_search(self, client, admin_headers, make_product):
        make_product(name="搜尋目標商品")
        client.post("/api/v1/admin/users", headers=admin_headers, json={
            "email": "q@x.com", "username": "quser",
        })

        assert _logs(client, admin_headers, target_type="product")["total"] == 1
        assert _logs(client, admin_headers, target_type="user")["total"] == 1
        assert _logs(client, admin_headers, q="搜尋目標")["total"] == 1

    def test_requires_admin(self, client, user_headers):
        res = client.get("/api/v1/admin/audit-logs", headers=user_headers)
        assert res.status_code == 403


class TestRetention:
    def test_cleanup_removes_only_old_logs(self, client, admin_headers, make_product):
        make_product()  # 產生一筆新鮮紀錄

        # 手動塞一筆 100 天前的舊紀錄
        db = SessionLocal()
        db.add(AuditLog(
            action="OLD_ACTION", target_type="order", target_id="x",
            summary="舊紀錄", created_at=datetime.utcnow() - timedelta(days=100),
        ))
        db.commit()
        removed = cleanup_old_logs(db)  # 預設 90 天
        db.close()

        assert removed == 1
        logs = _logs(client, admin_headers)
        assert all(x["action"] != "OLD_ACTION" for x in logs["items"])
        assert logs["total"] >= 1  # 新鮮紀錄仍在
