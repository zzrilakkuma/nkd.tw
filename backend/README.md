# Hookah Store Backend API

使用 FastAPI 建立的水煙商城後端 API。

## 功能特色

- 🔐 JWT 認證系統
- 👤 使用者註冊/登入
- 🛍️ 商品管理 (CRUD)
- 🛒 購物車功能
- 📦 訂單管理
- 💳 付款處理
- 🔒 管理員權限控制
- 📚 自動 API 文檔 (Swagger/ReDoc)

## 技術棧

- **框架**: FastAPI 0.104.1
- **資料庫**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **認證**: JWT (python-jose)
- **密碼加密**: bcrypt (passlib)
- **資料驗證**: Pydantic
- **遷移工具**: Alembic

## 專案結構

```
backend/
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── auth.py      # 認證相關 API
│   │   │   ├── products.py  # 商品管理 API
│   │   │   └── orders.py    # 訂單管理 API
│   │   ├── dependencies.py  # 依賴注入
│   │   └── router.py        # 路由設定
│   ├── core/
│   │   ├── config.py        # 配置設定
│   │   ├── database.py      # 資料庫連接
│   │   └── security.py      # 安全相關
│   ├── models/              # 資料庫模型
│   │   ├── user.py
│   │   ├── product.py
│   │   └── order.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   └── order.py
│   └── main.py              # 主程式
├── alembic/                 # 資料庫遷移
├── requirements.txt         # 依賴套件
├── .env.example            # 環境變數範例
└── README.md
```

## 安裝與設定

### 1. 建立虛擬環境

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. 安裝依賴

```bash
pip install -r requirements.txt
```

### 3. 設定環境變數

複製 `.env.example` 為 `.env` 並填入實際值：

```bash
cp .env.example .env
```

編輯 `.env`：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hookah_store
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:3000
```

### 4. 建立資料庫

```bash
# PostgreSQL
createdb hookah_store

# 或使用 Docker
docker run --name hookah-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hookah_store \
  -p 5432:5432 \
  -d postgres:15
```

### 5. 執行資料庫遷移

```bash
alembic upgrade head
```

### 6. 啟動開發伺服器

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 將在 http://localhost:8000 運行

## API 文檔

啟動伺服器後可訪問：

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## API 端點

### 認證

- `POST /api/v1/auth/register` - 使用者註冊
- `POST /api/v1/auth/login` - 使用者登入
- `GET /api/v1/auth/me` - 取得當前使用者資訊

### 商品

- `GET /api/v1/products` - 取得所有商品
- `GET /api/v1/products/{id}` - 取得單一商品
- `POST /api/v1/products` - 建立商品 (管理員)
- `PUT /api/v1/products/{id}` - 更新商品 (管理員)
- `DELETE /api/v1/products/{id}` - 刪除商品 (管理員)

### 訂單

- `POST /api/v1/orders` - 建立訂單
- `GET /api/v1/orders` - 取得使用者訂單
- `GET /api/v1/orders/{id}` - 取得單一訂單
- `PUT /api/v1/orders/{id}` - 更新訂單
- `GET /api/v1/orders/admin/all` - 取得所有訂單 (管理員)

## 資料庫 Schema

### User (使用者)
- id (String, PK)
- email (String, Unique)
- username (String, Unique)
- hashed_password (String)
- is_admin (Boolean)
- created_at (DateTime)

### Product (商品)
- id (String, PK)
- name (String)
- description (String)
- price (Float)
- image (String)
- stock (Integer)
- category (String)

### Order (訂單)
- id (String, PK)
- user_id (String, FK)
- status (Enum)
- total_amount (Float)
- shipping_info (JSON)
- payment_info (JSON)
- created_at (DateTime)
- updated_at (DateTime)

### OrderItem (訂單項目)
- id (Integer, PK)
- order_id (String, FK)
- product_id (String, FK)
- quantity (Integer)
- price (Float)

## 開發

### 執行測試

```bash
pytest
```

### 建立新的資料庫遷移

```bash
alembic revision --autogenerate -m "描述"
alembic upgrade head
```

### 程式碼格式化

```bash
black app/
isort app/
```

## 部署

### 使用 Docker

```bash
# 建立映像
docker build -t hookah-store-api .

# 執行容器
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name hookah-api \
  hookah-store-api
```

### 生產環境設定

1. 使用強密碼和安全的 SECRET_KEY
2. 設定 HTTPS
3. 使用生產級資料庫
4. 設定日誌和監控
5. 使用 Gunicorn 或 uWSGI
6. 設定反向代理 (Nginx)

```bash
# 使用 Gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

## 授權

MIT License

## 作者

Generated with Claude Code
