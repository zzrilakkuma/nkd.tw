# Zeabur 後端環境變數配置指南

## ❌ 常見錯誤：crashed retrying

這個錯誤通常是因為缺少必需的環境變數。

---

## 🔐 必需的環境變數

### 1. DATABASE_URL

這是 PostgreSQL 資料庫連接字串。

#### 如何獲取：

1. 在 Zeabur 專案中找到您部署的 **PostgreSQL 服務**
2. 點擊進入該服務
3. 查找 **Connection String** 或 **連接資訊**
4. 複製連接字串

#### 格式範例：

```
postgresql://username:password@postgres.zeabur.internal:5432/database_name
```

**重要提示：**
- 使用 Zeabur **內部網路地址**：`postgres.zeabur.internal`
- 不要使用外部地址（如 `xxx.zeabur.app`）

#### 在 Zeabur 設置：

```
變數名: DATABASE_URL
變數值: postgresql://user:pass@postgres.zeabur.internal:5432/hookah_store
```

---

### 2. SECRET_KEY

用於 JWT Token 加密的密鑰。

#### 生成方法：

**選項 A：使用 Python**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**選項 B：使用 OpenSSL**
```bash
openssl rand -hex 32
```

#### 已為您生成：

```
5eb31db34ea657f796675790cdedb713ec10300fccf9b437e2d1dab1632dd6f7
```

#### 在 Zeabur 設置：

```
變數名: SECRET_KEY
變數值: 5eb31db34ea657f796675790cdedb713ec10300fccf9b437e2d1dab1632dd6f7
```

**安全提醒：** 請妥善保管此密鑰，不要提交到 Git！

---

### 3. FRONTEND_URL

前端網域（用於 CORS 配置）。

#### 在 Zeabur 設置：

```
變數名: FRONTEND_URL
變數值: https://your-frontend.zeabur.app
```

**注意：** 請將 `your-frontend.zeabur.app` 替換為您前端的實際網域。

---

## 📋 在 Zeabur 中配置環境變數

### 步驟：

1. **進入後端服務頁面**
   - 在 Zeabur 專案中找到您的後端服務
   - 點擊進入

2. **打開環境變數設置**
   - 找到 **Variables** 或 **環境變數** 標籤
   - 點擊 **Add Variable** 或 **新增變數**

3. **添加環境變數**

   **變數 1：資料庫連接**
   ```
   Name:  DATABASE_URL
   Value: postgresql://xxx:xxx@postgres.zeabur.internal:5432/hookah_store
   ```

   **變數 2：密鑰**
   ```
   Name:  SECRET_KEY
   Value: 5eb31db34ea657f796675790cdedb713ec10300fccf9b437e2d1dab1632dd6f7
   ```

   **變數 3：前端網域**
   ```
   Name:  FRONTEND_URL
   Value: https://your-frontend.zeabur.app
   ```

4. **保存並重新部署**
   - 保存環境變數
   - 點擊 **Redeploy** 重新部署

---

## 🔍 獲取 PostgreSQL 連接資訊

### 方法 1：從 Zeabur 控制台

1. 進入 PostgreSQL 服務頁面
2. 查看 **Connect** 或 **連接** 標籤
3. 複製 **Internal Connection String**（內部連接字串）

### 方法 2：從環境變數

Zeabur 自動提供這些變數：
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

您可以組合它們：
```
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}
```

或直接使用 Zeabur 提供的：
```
${DATABASE_URL}
```

---

## ✅ 驗證配置

配置完成後，檢查：

1. **查看日誌**
   - 進入後端服務
   - 查看 **Logs** 或 **日誌**
   - 確認沒有 "Configuration Error" 錯誤

2. **測試健康檢查**
   ```
   https://your-backend.zeabur.app/health
   ```
   應該返回：
   ```json
   {"status": "healthy"}
   ```

3. **查看 API 文檔**
   ```
   https://your-backend.zeabur.app/api/v1/docs
   ```

---

## 🚨 常見問題

### 問題 1：仍然顯示 "crashed retrying"

**解決方法：**
1. 檢查環境變數是否正確設置
2. 確認 DATABASE_URL 使用內部地址
3. 查看日誌中的具體錯誤信息

### 問題 2：資料庫連接失敗

**可能原因：**
- DATABASE_URL 格式錯誤
- 使用了外部地址而非內部地址
- PostgreSQL 服務未啟動

**解決方法：**
```
# 確保使用內部地址
postgresql://user:pass@postgres.zeabur.internal:5432/db
```

### 問題 3：CORS 錯誤

**解決方法：**
- 確認 FRONTEND_URL 與前端實際網域一致
- 包含協議（https://）
- 不要在末尾加斜線

---

## 📊 完整配置檢查清單

- [ ] PostgreSQL 服務已部署並運行
- [ ] DATABASE_URL 環境變數已設置（使用內部地址）
- [ ] SECRET_KEY 環境變數已設置
- [ ] FRONTEND_URL 環境變數已設置
- [ ] 已保存環境變數
- [ ] 已重新部署後端服務
- [ ] 日誌中無錯誤信息
- [ ] /health 端點可訪問
- [ ] /api/v1/docs 可訪問

---

## 💡 環境變數範本

複製並修改以下內容：

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres.zeabur.internal:5432/hookah_store
SECRET_KEY=5eb31db34ea657f796675790cdedb713ec10300fccf9b437e2d1dab1632dd6f7
FRONTEND_URL=https://your-frontend-name.zeabur.app
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

需要更多幫助？請查看日誌並提供錯誤信息！
