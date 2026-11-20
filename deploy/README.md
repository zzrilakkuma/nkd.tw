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
| `restore.sh` | 從 dump 還原（災難復原用） |
| `migrate-from-zeabur.sh` | 從 Zeabur 匯出並還原（正式切換用） |
| `Caddyfile.api-only` | 預演用，只開放 API 網域 |

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

## 2. DNS（Cloudmax，名稱伺服器為 ix1000）

切換前先做，不影響舊站：

| 記錄 | 類型 | 值 | 備註 |
|---|---|---|---|
| `api` | A | VPS IP | 現在就能加 |
| `@` | A | VPS IP | **切換當天**才改 |
| `www` | A / CNAME | VPS IP / `nkd.tw` | **切換當天**才改 |

Cloudmax 的 TTL 只有 10 分鐘與 240 分鐘兩種，請確認 `@` 是 10 分鐘。

## 3. 放上程式碼與設定

```bash
mkdir -p /opt && cd /opt
git clone git@github.com:zzrilakkuma/nkd.tw.git hookah-store
cd hookah-store/deploy
cp .env.example .env
nano .env   # 填 ACME_EMAIL、POSTGRES_PASSWORD、SECRET_KEY、RESEND_API_KEY 等
```

`SECRET_KEY` 沿用 Zeabur 上的值可保留現有登入；`POSTGRES_VERSION` 預設 18，與 Zeabur 上的 PostgreSQL 版本一致；compose 的資料卷掛載方式僅適用 18 以上。

## 4. 第一次啟動

```bash
./deploy.sh --no-pull
docker compose -f docker-compose.prod.yml logs -f api   # 看到 Uvicorn running 即可 Ctrl+C
```

此時 `https://api.nkd.tw/health` 應回 `{"status":"healthy"}`。
裸網域還指向 Zeabur，所以前端先不用驗。

## 5. 從 Zeabur 搬資料庫

在 VPS 執行（會提示輸入 Zeabur PostgreSQL 的密碼）：

```bash
cd /opt/hookah-store/deploy
./migrate-from-zeabur.sh
```

腳本會用同版本的 `pg_dump` 直接從 Zeabur 的公網位址匯出、停 API、還原、再啟動 API，最後印出訂單、使用者、圖片筆數。匯出失敗時不會動到本機資料。
來源位址可用環境變數 `SRC_HOST`、`SRC_PORT`、`SRC_USER`、`SRC_DB` 覆寫。

手上已有 dump 檔時改用 `./restore.sh backups/<檔名>.dump`。

## 6. 切換前驗證（只開放 API 網域）

切換前 `nkd.tw`、`www` 的 DNS 還指向舊主機，Let's Encrypt 驗證不會過，所以**不能**用 hosts 檔預先驗證前端，也不要用完整的 Caddyfile 啟動（會不斷申請失敗並累積到頻率上限）。

預演時只開 API 網域：

```bash
echo 'CADDYFILE=./Caddyfile.api-only' >> .env
docker compose -f docker-compose.prod.yml up -d caddy
```

然後確認 `https://api.nkd.tw/health`、商品 API、圖片端點與 CORS。
注意此時資料庫是真實客戶資料且寄信功能啟用，測試只用自己的帳號。

## 7. 正式切換

1. 挑訂單少的時段，先在 Zeabur 暫停後端服務（避免切換期間產生新單）；PostgreSQL 服務保持運作。
2. 重跑第 5 步的 `./migrate-from-zeabur.sh`，取得最新資料。
3. 到 Cloudmax 把 `nkd.tw` 的 A 記錄改指向 VPS IP，並新增 `www` 的 A 記錄。
4. 權威 DNS（`dig +short nkd.tw @ns1.ix1000.com`）回新 IP 後，移除 `.env` 的 `CADDYFILE=` 那一行並 `docker compose -f docker-compose.prod.yml up -d caddy`，換回完整設定。
5. 驗證首頁、登入、下單、通知信。
6. Zeabur 專案保留 1 到 2 週再刪。

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
