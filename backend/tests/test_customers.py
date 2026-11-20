"""客戶檔案：列表統計、搜尋、單一檔案、管理員修改資料。"""
from tests.conftest import CUSTOMER_EMAIL

BASE = "/api/v1/admin/users"


def _customer(client, admin_headers):
    res = client.get(f"{BASE}/customers", headers=admin_headers)
    assert res.status_code == 200, res.text
    return next(c for c in res.json() if c["email"] == CUSTOMER_EMAIL)


class TestCustomerProfiles:
    def test_list_excludes_admins_and_counts_orders(self, client, admin_headers,
                                                    make_product, make_order):
        _, sku = make_product(price=500)
        make_order(sku["id"], quantity=2)

        res = client.get(f"{BASE}/customers", headers=admin_headers)
        assert res.status_code == 200
        emails = [c["email"] for c in res.json()]
        assert emails == [CUSTOMER_EMAIL]  # 管理員不列入

        c = res.json()[0]
        assert c["order_count"] == 1
        assert c["completed_count"] == 0
        assert c["completed_total"] == 0
        assert c["last_order_at"] is not None

    def test_search(self, client, admin_headers):
        cid = _customer(client, admin_headers)["id"]
        client.patch(f"{BASE}/{cid}", headers=admin_headers, json={"company_name": "大煙霧有限公司"})

        hit = client.get(f"{BASE}/customers", headers=admin_headers, params={"q": "煙霧"}).json()
        assert [c["id"] for c in hit] == [cid]
        miss = client.get(f"{BASE}/customers", headers=admin_headers, params={"q": "不存在"}).json()
        assert miss == []

    def test_detail_includes_orders(self, client, admin_headers, make_product, make_order):
        _, sku = make_product(price=300)
        order = make_order(sku["id"])
        cid = _customer(client, admin_headers)["id"]

        res = client.get(f"{BASE}/{cid}", headers=admin_headers)
        assert res.status_code == 200
        detail = res.json()
        assert detail["email"] == CUSTOMER_EMAIL
        assert [o["id"] for o in detail["orders"]] == [order["id"]]
        assert detail["orders"][0]["status"] == "pending_review"

    def test_detail_not_found(self, client, admin_headers):
        assert client.get(f"{BASE}/nope", headers=admin_headers).status_code == 404

    def test_admin_edits_profile_and_addresses(self, client, admin_headers):
        cid = _customer(client, admin_headers)["id"]
        res = client.patch(f"{BASE}/{cid}", headers=admin_headers, json={
            "email": "renamed@test.com",
            "username": "renamed",
            "contact_name": "王小明",
            "contact_phone": "0911222333",
            "tax_id": "12345678",
            "saved_address": [{
                "id": "a1", "label": "公司", "name": "王小明", "phone": "0911222333",
                "postalCode": "100", "city": "台北市", "address": "測試路 2 號",
            }],
        })
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["email"] == "renamed@test.com"
        assert body["username"] == "renamed"
        assert body["saved_address"][0]["address"] == "測試路 2 號"

        logs = client.get("/api/v1/admin/audit-logs", headers=admin_headers,
                          params={"action": "USER_UPDATE"}).json()
        assert logs["total"] == 1
        assert logs["items"][0]["after"]["email"] == "renamed@test.com"

    def test_duplicate_email_or_username_rejected(self, client, admin_headers):
        cid = _customer(client, admin_headers)["id"]
        res = client.patch(f"{BASE}/{cid}", headers=admin_headers, json={"email": "admin@test.com"})
        assert res.status_code == 400
        res = client.patch(f"{BASE}/{cid}", headers=admin_headers, json={"username": "admin"})
        assert res.status_code == 400
        res = client.patch(f"{BASE}/{cid}", headers=admin_headers, json={"username": "   "})
        assert res.status_code == 422

    def test_requires_admin(self, client, user_headers):
        assert client.get(f"{BASE}/customers", headers=user_headers).status_code == 403
