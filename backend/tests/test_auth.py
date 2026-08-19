"""P0 帳號管控：禁止註冊、admin 建帳號、臨時密碼、強制改密、停用。"""
from tests.conftest import ADMIN_EMAIL, PASSWORD


class TestRegisterRemoved:
    def test_public_register_endpoint_removed(self, client):
        res = client.post("/api/v1/auth/register", json={
            "email": "x@x.com", "username": "x", "password": "password123",
        })
        assert res.status_code == 404


class TestLogin:
    def test_login_success(self, client):
        res = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": PASSWORD})
        assert res.status_code == 200
        body = res.json()
        assert body["user"]["is_admin"] is True
        assert body["user"]["must_change_password"] is False

    def test_login_wrong_password(self, client):
        res = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert res.status_code == 401


class TestAdminUserManagement:
    def test_create_user_first_login_forced_change(self, client, admin_headers):
        # admin 建帳號 → 取得臨時密碼
        res = client.post("/api/v1/admin/users", headers=admin_headers, json={
            "email": "corp1@x.com", "username": "corp1", "company_name": "測試公司",
        })
        assert res.status_code == 201
        temp = res.json()["temp_password"]
        assert res.json()["user"]["must_change_password"] is True

        # 用臨時密碼登入 → must_change 為 True
        res = client.post("/api/v1/auth/login", json={"email": "corp1@x.com", "password": temp})
        assert res.status_code == 200
        assert res.json()["user"]["must_change_password"] is True
        headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

        # 改密碼 → 解除強制
        res = client.put("/api/v1/auth/password", headers=headers, json={
            "old_password": temp, "new_password": "newpass123",
        })
        assert res.status_code == 200
        assert res.json()["must_change_password"] is False

        # 舊密碼失效、新密碼可登入
        assert client.post("/api/v1/auth/login", json={"email": "corp1@x.com", "password": temp}).status_code == 401
        assert client.post("/api/v1/auth/login", json={"email": "corp1@x.com", "password": "newpass123"}).status_code == 200

    def test_change_password_wrong_old(self, client, user_headers):
        res = client.put("/api/v1/auth/password", headers=user_headers, json={
            "old_password": "wrong", "new_password": "whatever123",
        })
        assert res.status_code == 400

    def test_deactivate_blocks_login(self, client, admin_headers):
        created = client.post("/api/v1/admin/users", headers=admin_headers, json={
            "email": "corp2@x.com", "username": "corp2",
        }).json()
        uid, temp = created["user"]["id"], created["temp_password"]

        res = client.patch(f"/api/v1/admin/users/{uid}", headers=admin_headers, json={"is_active": False})
        assert res.status_code == 200
        res = client.post("/api/v1/auth/login", json={"email": "corp2@x.com", "password": temp})
        assert res.status_code == 403

    def test_admin_cannot_deactivate_self(self, client, admin_headers):
        me = client.get("/api/v1/auth/me", headers=admin_headers).json()
        res = client.patch(f"/api/v1/admin/users/{me['id']}", headers=admin_headers, json={"is_active": False})
        assert res.status_code == 400

    def test_reset_password_reactivates_forced_change(self, client, admin_headers):
        created = client.post("/api/v1/admin/users", headers=admin_headers, json={
            "email": "corp3@x.com", "username": "corp3",
        }).json()
        uid = created["user"]["id"]

        res = client.post(f"/api/v1/admin/users/{uid}/reset-password", headers=admin_headers)
        assert res.status_code == 200
        new_temp = res.json()["temp_password"]
        assert new_temp != created["temp_password"]

        res = client.post("/api/v1/auth/login", json={"email": "corp3@x.com", "password": new_temp})
        assert res.status_code == 200
        assert res.json()["user"]["must_change_password"] is True

    def test_non_admin_forbidden(self, client, user_headers):
        assert client.get("/api/v1/admin/users", headers=user_headers).status_code == 403
        assert client.post("/api/v1/admin/users", headers=user_headers, json={
            "email": "e@x.com", "username": "e",
        }).status_code == 403
