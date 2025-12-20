# Zeabur 部署指南 - Hookah Store

## 📋 專案結構

```
hookah-store/
├── frontend (根目錄)
│   ├── Dockerfile          ✅ 已創建
│   ├── .dockerignore       ✅ 已創建
│   ├── zbpack.json         ✅ 已創建
│   └── package.json
└── backend/
    ├── Dockerfile          ✅ 已優化
    ├── .dockerignore       ✅ 已創建
    ├── zbpack.json         ✅ 已創建
    └── requirements.txt
```

---

## 🚀 部署步驟

### 第一步：連接 GitHub

1. 登入 [Zeabur](https://zeabur.com)
2. 創建新專案 (New Project)
3. 連接您的 GitHub 倉庫

### 第二步：部署資料庫

1. 在專案中點擊 "Add Service" → "Marketplace"
2. 選擇 **PostgreSQL**
3. 等待部署完成
4. 複製連接資訊（後續會用到）

### 第三步：部署後端 API

1. 點擊 "Add Service" → "Git"
2. 選擇您的 `hookah-store` 倉庫
3. **重要設定**：
   - **Root Directory**: `backend`
   - **Service Name**: `hookah-api` (或自訂)

4. 配置環境變數（在 Variables 標籤）：

```env
DATABASE_URL=postgresql://username:password@postgres.zeabur.internal:5432/hookah_store
SECRET_KEY=your-super-secret-key-change-this-in-production
FRONTEND_URL=https://your-frontend.zeabur.app
```

**取得 DATABASE_URL：**
- 從第二步部署的 PostgreSQL 服務中複製
- 將 host 改為 `postgres.zeabur.internal`（Zeabur 內部網路）

5. 點擊 **Deploy**

### 第四步：部署前端

1. 再次點擊 "Add Service" → "Git"
2. 選擇同一個 `hookah-store` 倉庫
3. **重要設定**：
   - **Root Directory**: `/` (根目錄)
   - **Service Name**: `hookah-frontend` (或自訂)

4. **⚠️ 必需配置環境變數**（在 Variables 標籤）：

```env
REACT_APP_API_URL=https://your-backend.zeabur.app/api/v1
```

**🔴 重要提醒（必讀）**：
- 這個環境變數**必須在部署前設置**，否則前端會連接到 localhost
- **環境變數會在構建時編譯進 JavaScript**，修改後需要**重新部署**才會生效
- 請將 `your-backend.zeabur.app` 替換為你的後端實際域名
- 路徑必須包含 `/api/v1`
- 必須使用 `https://` 協議

**設置步驟**：
1. 先部署後端，取得後端域名（例如：`https://hookah-api-xxx.zeabur.app`）
2. 在前端服務的 Variables 標籤中設置：
   ```
   REACT_APP_API_URL=https://hookah-api-xxx.zeabur.app/api/v1
   ```
3. 點擊 **Redeploy** 重新構建前端（環境變數才會生效）

5. 點擊 **Deploy**

### 第五步：配置網域和 CORS

1. **前端網域**：
   - 在前端服務中點擊 "Domain"
   - 添加自訂網域或使用 Zeabur 提供的網域

2. **後端網域**：
   - 在後端服務中點擊 "Domain"
   - 添加自訂網域或使用 Zeabur 提供的網域

3. **更新後端環境變數**：
   - 將 `FRONTEND_URL` 更新為前端的實際網域
   - 重新部署後端服務

---

## 🔐 環境變數清單

### Backend (hookah-api)

| 變數名稱 | 說明 | 示例 |
|---------|------|------|
| `DATABASE_URL` | PostgreSQL 連接字串 | `postgresql://user:pass@postgres.zeabur.internal:5432/db` |
| `SECRET_KEY` | JWT 密鑰（必須隨機生成） | `openssl rand -hex 32` |
| `FRONTEND_URL` | 前端網域（用於 CORS） | `https://your-app.zeabur.app` |
| `ALGORITHM` | JWT 算法（可選） | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token 過期時間（可選） | `30` |

### Frontend (hookah-frontend)

| 變數名稱 | 說明 | 示例 |
|---------|------|------|
| `REACT_APP_API_URL` | 後端 API 地址 | `https://api.your-app.zeabur.app/api/v1` |

---

## 🎯 生成安全的 SECRET_KEY

在終端執行以下命令：

```bash
openssl rand -hex 32
```

或使用 Python：

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ✅ 驗證部署

部署完成後，檢查以下內容：

1. **後端健康檢查**：
   ```
   https://your-backend.zeabur.app/health
   ```
   應該返回：`{"status": "healthy"}`

2. **API 文檔**：
   ```
   https://your-backend.zeabur.app/api/v1/docs
   ```

3. **前端頁面**：
   ```
   https://your-frontend.zeabur.app
   ```

---

## 🔧 常見問題

### 1. 前端黑屏或顯示錯誤
**症狀**：前端部署成功但打開網頁是黑屏或顯示 API 連接錯誤

**解決方法**：
1. 確認 `REACT_APP_API_URL` 環境變數已設置
2. 在 Zeabur 前端服務中點擊 **Redeploy** 重新構建
3. 打開瀏覽器開發者工具（F12）查看 Console 錯誤信息
4. 確認後端已成功部署並可訪問

### 2. 前端連接到 localhost
**症狀**：前端嘗試連接 `http://localhost:8000`

**原因**：環境變數在構建時未注入

**解決方法**：
1. 確保在 Variables 標籤設置了 `REACT_APP_API_URL`
2. **重新部署前端**（環境變數修改後必須重新構建）
3. 檢查構建日誌，確認環境變數已正確傳遞

### 3. CORS 錯誤
**症狀**：瀏覽器 Console 顯示 CORS policy 錯誤

**解決方法**：
- 確認後端的 `FRONTEND_URL` 環境變數設置正確
- 確認前端的實際網域與環境變數匹配（包括 `https://`）
- 重新部署後端服務

### 4. 資料庫連接失敗
**症狀**：後端啟動失敗，日誌顯示數據庫連接錯誤

**解決方法**：
- 檢查 `DATABASE_URL` 格式是否正確
- 確認使用 Zeabur 內部網路地址（`postgres.zeabur.internal`）
- 確認 PostgreSQL 服務已成功部署

### 5. 後端啟動失敗
**症狀**：後端服務狀態顯示失敗

**解決方法**：
- 查看服務日誌（Logs 標籤）
- 確認 `DATABASE_URL` 和 `SECRET_KEY` 已設置
- 檢查是否有 Python 依賴安裝失敗

### 6. 構建失敗
**症狀**：Docker 構建過程失敗

**解決方法**：
- 檢查 Dockerfile 路徑是否正確
- 查看構建日誌，確認依賴安裝成功
- 確認 Root Directory 設置正確（前端：`/`，後端：`backend`）

---

## 📊 服務架構

```
[用戶]
   ↓
[Frontend - Node.js/React]
   ↓ (HTTPS)
[Backend API - FastAPI]
   ↓ (內部網路)
[PostgreSQL Database]
```

---

## 🔄 更新部署

當您推送代碼到 GitHub 時，Zeabur 會自動重新部署：

1. Push 代碼到 GitHub
2. Zeabur 自動檢測變更
3. 自動構建並部署

或者手動重新部署：
1. 進入服務頁面
2. 點擊 "Redeploy"

---

## 💡 優化建議

1. **使用自訂網域**：提升專業性
2. **啟用 HTTPS**：Zeabur 自動提供
3. **監控日誌**：定期檢查服務日誌
4. **備份資料庫**：定期導出資料庫數據
5. **環境分離**：考慮創建 staging 環境用於測試

---

## 📞 需要幫助？

- Zeabur 文檔：https://zeabur.com/docs
- GitHub Issues：提交問題到專案倉庫
