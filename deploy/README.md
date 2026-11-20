# Hostinger VPS 部署指南（取代 Zeabur）

```
Caddy :443（自動 HTTPS）
 ├─ nkd.tw / www.nkd.tw → web（React build）
 └─ api.nkd.tw          → api（FastAPI）→ postgres（圖片也存在 DB 內）
```

本目錄檔案：

| 檔案 | 用途 |
|---|---|
| `docker-compose.prod.yml` | 四個服務的定義 |
| `Caddyfile` | 網域、HTTPS、反向代理 |
| `.env.example` | 環境變數範本，複製成 `.env`（不進 git） |
| `deploy.sh` | 更新程式碼、重新 build、重啟 |
| `backup.sh` | 每日 pg_dump，保留 14 天 |
| `restore.sh` | 從 dump 還原（搬家與災難復原用） |

---

## 1. 開 VPS

- 方案：Hostinger **KVM 1** 起跳（KVM 2 較有餘裕），機房選 **新加坡**。
- 作業系統範本：**Ubuntu 24.04 with Docker**。
- 建立時選用 SSH 金鑰登入。

第一次登入後：

```bash
apt update && apt upgrade -y
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
timedatectl set-timezone Asia/Taipei
docker --version && docker compose version
```

## 2. DNS（ix1000）

切換前先做，不影響舊站：

| 記錄 | 類型 | 值 | 備註 |
|---|---|---|---|
| `api` | A | VPS IP | 現在就能加 |
| `@` | A | VPS IP | **切換當天**才改 |
| `www` | A / CNAME | VPS IP / `nkd.tw` | **切換當天**才改 |

切換前一天把 `@` 與 `www` 的 TTL 降到 300。

## 3. 放上程式碼與設定

```bash
mkdir -p /opt && cd /opt
git clone git@github.com:zzrilakkuma/nkd.tw.git hookah-store
cd hookah-store/deploy
cp .env.example .env
nano .env   # 填 ACME_EMAIL、POSTGRES_PASSWORD、SECRET_KEY、RESEND_API_KEY 等
```

`SECRET_KEY` 沿用 Zeabur 上的值可保留現有登入；`POSTGRES_VERSION` 請設成與 Zeabur PostgreSQL 相同的 major 版本（在 Zeabur 容器執行 `psql --version` 可查）。

## 4. 第一次啟動

```bash
./deploy.sh --no-pull
docker compose -f docker-compose.prod.yml logs -f api   # 看到 Uvicorn running 即可 Ctrl+C
```

此時 `https://api.nkd.tw/health` 應回 `{"status":"healthy"}`。
裸網域還指向 Zeabur，所以前端先不用驗。

## 5. 從 Zeabur 搬資料庫

在本機（需 `pg_dump`，版本 ≥ Zeabur 的 PostgreSQL）：

```bash
pg_dump "<Zeabur 的外部 DATABASE_URL>" -Fc -f hookah_store-zeabur.dump
scp hookah_store-zeabur.dump root@<VPS IP>:/opt/hookah-store/deploy/backups/
```

在 VPS：

```bash
cd /opt/hookah-store/deploy
./restore.sh backups/hookah_store-zeabur.dump
docker compose -f docker-compose.prod.yml logs --tail=50 api
```

確認日誌裡 migration 完成、seed 顯示「已有資料，略過」。

## 6. 切換前驗證（用 hosts 檔指向新 IP）

在自己電腦的 `/etc/hosts` 加一行 `<VPS IP> nkd.tw www.nkd.tw`，然後：

- 開首頁、商品圖片顯示正常
- 登入、下一張測試單、後台看得到
- Resend 通知信有寄出
- 完成後把 hosts 那行移除

## 7. 正式切換

1. 挑訂單少的時段，先在 Zeabur 暫停 api 服務（避免切換期間產生新單）。
2. 重做第 5 步（最終 dump 與還原）。
3. 到 ix1000 把 `@`、`www` 改指向 VPS IP。
4. `dig +short nkd.tw` 看到新 IP 後，重跑第 6 步的驗證。
5. Zeabur 專案保留 1 到 2 週再刪。

## 8. 備份

```bash
crontab -e
# 加入：
0 4 * * * /opt/hookah-store/deploy/backup.sh >> /var/log/hookah-backup.log 2>&1
```

另外在 Hostinger 後台開啟 VPS 每週快照。備份檔在 `deploy/backups/`，異地保存可再 `rclone` 到雲端硬碟。

## 9. 日常更新

```bash
cd /opt/hookah-store/deploy && ./deploy.sh
```

會 `git pull`、重新 build、重啟，並等待 `/health` 通過。
前端 API 位址是 build 時寫入的，改 `API_DOMAIN` 後也要跑一次 `deploy.sh`。

## 常用指令

```bash
C="docker compose -f /opt/hookah-store/deploy/docker-compose.prod.yml"
$C ps                      # 狀態
$C logs -f api             # API 日誌
$C logs -f caddy           # 憑證／代理問題看這裡
$C exec postgres psql -U hookah -d hookah_store   # 進資料庫
$C restart api             # 只重啟 API
```

## 疑難排解

- **憑證申請失敗**：確認 DNS 已指向 VPS、80/443 有開，看 `logs caddy`。
- **前端打到 localhost:8000**：`.env` 的 `API_DOMAIN` 沒填或沒重新 build，跑 `deploy.sh`。
- **CORS 錯誤**：`FRONTEND_URL` 由 `SITE_DOMAIN` 組成，確認瀏覽器網址與其一致（含 https、無尾斜線）。
- **api 一直重啟**：`logs api`，多半是 `SECRET_KEY` 空白或 postgres 尚未 healthy。
