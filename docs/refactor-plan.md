# V1.1 半自動版 — 實作計畫

> 對照：[需求大綱](./V1.1-半自動版需求大綱.md)、[差距分析](./gap-analysis.md)
> 技術棧：FastAPI + SQLAlchemy + Alembic（後端）、React + TS（前端）

本計畫將需求拆成 **7 個階段**，每階段可獨立交付、獨立測試。標註 🔴 者為高風險，優先。

---

## 階段總覽

| 階段 | 主題 | 依賴 | 風險 |
|---|---|---|---|
| P0 | 帳號管控（關註冊 / 臨時密碼 / 強制改密） | — | 🔴 |
| P1 | 商品資料模型重構（Brand/Category/Product/SKU） | — | 🔴 |
| P2 | 訂單狀態機（7 態）+ 後端金額重算 | P1 | 🔴 |
| P3 | 三種配送 + 自取地點 + 地址快照 | P2 | 中 |
| P4 | 人工核對 + 運費輸入 + 核對鎖定 | P2, P3 | 中 |
| P5 | 庫存保留 + 48h 倒數 + 自動逾期釋放 | P2 | 🔴 |
| P6 | 操作紀錄（audit log） | P0–P5 | 低 |

> 建議實際開發順序：P0 → P1 → P2 → P5 → P3 → P4 → P6
> （P5 庫存保留與 P2 狀態機關係最緊，先打穩核心，配送/核對再疊上。）

---

## P0 — 帳號管控 🔴

**目標**：符合「僅核准客戶、無公開註冊、臨時密碼、首次強制改密」。

### 資料模型（`User` 新增欄位）
```
must_change_password : bool = True   # 首次登入強制改密
company_name         : str  | null   # 公司名稱
contact_name         : str  | null   # 聯絡人
contact_phone        : str  | null   # 聯絡電話
tax_id               : str  | null   # 統一編號
is_active            : bool = True    # 停用帳號
```

### 端點變更
- ❌ 移除 / 關閉 `POST /auth/register`（或改為僅 admin 可呼叫）
- ➕ `POST /admin/users`（admin 建帳號，回傳臨時密碼）
- ➕ `POST /admin/users/{id}/reset-password`（admin 重設臨時密碼）
- ➕ `PUT /auth/password`（客戶自行改密碼，改完 `must_change_password=False`）
- 🔧 `login` 回傳加上 `must_change_password` 旗標，前端據此導向改密頁
- ➕ `PUT /auth/profile` 擴充公司聯絡資料

### 前端
- 移除註冊頁入口（保留檔案但不掛路由）
- 首次登入攔截 → 強制改密頁
- Profile 頁新增公司資訊欄位

---

## P1 — 商品資料模型重構 🔴

**目標**：品牌 / 類別 / 商品 / SKU 四層，價格與庫存下沉到 SKU。

### 新資料模型
```
Brand
  id, name, sort_order, is_active

Category
  id, name, sort_order, is_active

Product
  id, name, description, brand_id(FK), category_id(FK)
  main_image, images(JSON, 最多5), is_published, created_at

SKU
  id, product_id(FK)
  flavor, spec, unit
  price, stock            # 實體庫存
  reserved               # 保留量（見 P5）
  is_active
  # available = stock - reserved
```

### 端點
- `Brand` / `Category`：admin CRUD + 公開 list
- `Product`：admin CRUD（含上下架）+ 公開 list（依 brand/category 篩選）
- `SKU`：admin CRUD（掛在 product 下）
- 公開商品 list 只回 `is_published` 且 SKU `is_active`

### 遷移策略
- 現有扁平 `Product`（price/stock/category 字串）→ 寫一次性 migration：
  - 每個 category 字串 → 建 Category
  - 每個 Product → 建一個預設 SKU 承接原 price/stock
- 用 Alembic 產生 schema migration，資料搬移寫在 migration 或獨立 script。

### 前端
- 商品列表/詳情頁改為顯示 SKU 選擇（口味/規格）
- 購物車項目 key 改為 `sku_id`
- admin 商品管理頁改為 Brand/Category/Product/SKU 巢狀

---

## P2 — 訂單狀態機（7 態）+ 金額重算 🔴

### 狀態列舉（取代現有 6 態）
```
PENDING_REVIEW      等待管理員核對
PENDING_PAYMENT     等待付款
PENDING_CONFIRM     等待入帳確認
PREPARING           準備出貨
COMPLETED           已完成
CANCELLED           已取消
EXPIRED             已逾期
```

### 合法轉換（後端強制）
```
PENDING_REVIEW  → PENDING_PAYMENT (核對完成) | CANCELLED
PENDING_PAYMENT → PENDING_CONFIRM (客戶已付) | CANCELLED | EXPIRED(48h)
PENDING_CONFIRM → PREPARING (確認入帳) | CANCELLED
PREPARING       → COMPLETED | CANCELLED
```

### 訂單模型新增欄位
```
subtotal        : float           # 商品小計（後端算）
shipping_fee    : float = 0        # 運費（P4 admin 輸入）
total_amount    : float           # subtotal + shipping_fee（後端算）
delivery_method : enum             # P3
payment_deadline: datetime | null  # P5（進待付款時 +48h）
paid_at         : datetime | null
locked          : bool = False     # 核對完成鎖定
```

### 關鍵修正
- 🔴 建單時**後端依 SKU 現價重算 subtotal**，不信任前端 `total_amount`
- 下單後狀態 = `PENDING_REVIEW`
- 狀態轉換走專用 service，拒絕非法跳轉（取代 admin 隨意下拉）

### 前端
- 狀態標籤/流程條改 7 態
- admin 下拉改為「依當前狀態顯示可用動作」按鈕

---

## P3 — 三種配送 + 自取地點 + 地址快照

### 新模型
```
PickupLocation
  id, name, address, contact, note, is_active

OrderShipping (快照，存在訂單上或 JSON)
  method: SELF_PICKUP | CVS_711 | HOME_DELIVERY
  # SELF_PICKUP: pickup_location_snapshot(name/address/contact)
  # CVS_711: recipient, phone, store_name, store_code
  # HOME_DELIVERY: recipient, phone, address, note
```

- 下單時把選擇的地址/門市/自取點**快照**寫入訂單，日後改設定不影響舊單
- 自取 → `shipping_fee` 固定 0
- `PickupLocation` admin CRUD

### 前端
- Checkout 加配送方式切換，三種各自欄位
- 自取顯示地點下拉

---

## P4 — 人工核對 + 運費 + 鎖定

- admin 在 `PENDING_REVIEW` 可改 SKU/數量 → 同步調整保留庫存（見 P5）
- 改單超過可用庫存 → 拒絕儲存
- admin 輸入 `shipping_fee`（自取強制 0）
- 「核對完成」→ 重算 total、`locked=True`、狀態轉 `PENDING_PAYMENT`
- 鎖定後不可改品項（需取消重建）
- 前端：admin 訂單抽屜加「核對編輯」模式 + 運費欄位 + 核對完成鈕

---

## P5 — 庫存保留 + 48h 倒數 + 自動逾期 🔴

### 保留機制（SKU.reserved）
- 下單：`reserved += qty`（不動 stock），`available = stock - reserved`
- 核對改量：`reserved` 同步增減
- 客戶已付/入帳 → 出貨或完成時：`stock -= qty; reserved -= qty`（實扣）
- 取消/逾期：`reserved -= qty`（釋放）

> 需明確定義各狀態下 reserved/stock 的帳務，寫成單一 `inventory service`，避免散落。

### 48h 倒數與逾期
- 進 `PENDING_PAYMENT` 時設 `payment_deadline = now + 48h`
- 「我已完成付款」→ 轉 `PENDING_CONFIRM`，倒數停止
- 逾期處理二選一：
  - **A（推薦，簡單）**：背景排程（APScheduler / cron）定期掃描逾期單 → `EXPIRED` + 釋放庫存
  - B：讀取時惰性判定（lazy expire），但仍需排程回補庫存
- 前端付款頁顯示倒數，修正「3 工作天」文案

---

## P6 — 操作紀錄（audit log）

### 模型
```
AuditLog
  id, actor_id(FK user), actor_name
  action        # e.g. ORDER_STATUS_CHANGE / STOCK_ADJUST / SHIPPING_FEE_SET
  target_type   # order / product / sku / user
  target_id
  before(JSON), after(JSON)
  created_at
```

- 於各 service 寫入點記錄（帳號/商品/價格/庫存/運費/狀態/改單前後）
- admin 查詢介面（篩選 target / actor / 時間）
- 保留 3 個月（清理排程或查詢時過濾）

---

## 橫切事項

- **Migration**：每階段用 Alembic 產生 migration；P1 需資料搬移 script
- **測試**：至少覆蓋金額重算、狀態轉換合法性、庫存保留/釋放帳務、48h 逾期
- **交易一致性**：庫存與狀態變更需在同一 DB transaction
- **相容**：前端 `src/types/index.ts` 的 `OrderStatus`、`Product`、`CartItem` 需同步改

---

## 進度

- ✅ **P0 已完成**（2026-08-18）
  - `User` 新增 `must_change_password / is_active / company_name / contact_name / contact_phone / tax_id`
  - 導入 Alembic（`0001_baseline` + `0002_p0_account_controls`），`run_migrations.py` 相容既有 DB，`start.sh` 改用 `alembic upgrade`
  - 關閉公開註冊；新增 admin 建帳號/重設密碼/停用、客戶改密碼、login 檢查 `is_active` 與回傳 `must_change_password`
  - 前端：移除註冊入口、首次強制改密頁、admin 帳號管理頁、Profile 公司資料
  - 驗證：migration 雙路徑（全新 / 既有 DB）通過；後端 API 流程 smoke test 全綠；前端 build 通過
- ✅ **P1 已完成**（2026-08-18）
  - 新模型 `Brand / Category / Product / SKU`，價格與庫存下沉到 SKU（含 `reserved` 欄位，邏輯留待 P5）
  - Migration `0003_p1_catalog`：restructure `products`、建立三張新表、既有資料搬移（category 字串→Category、預設品牌、每商品建預設 SKU、`order_items.sku_id` 回填）
  - 端點：`/brands`、`/categories` CRUD；`/products` 巢狀（含 SKU 子路由）與 `/products/admin/all`；訂單改以 SKU 為單位
  - 🔒 **後端依 SKU 現價重算訂單金額**，不再信任前端傳入（提前修掉金額竄改風險）
  - 前端：types + api 正規化層、Products/Cart/Checkout/OrderConfirm/MyOrders/Payment 改 SKU、AdminProducts 重寫（商品+SKU+品牌/類別管理）
  - 驗證：migration（既有 DB 13 商品→13 SKU）、API smoke test、tsc/build 通過、瀏覽器實測商店與後台皆正常
- ✅ **P2 已完成**（2026-08-18）
  - `OrderStatus` 改為 7 態（`pending_review / pending_payment / pending_confirm / preparing / completed / cancelled / expired`）
  - Migration `0004_p2_order_states`：狀態欄位改純字串（跨 DB 移除舊 enum/check）、值重新對應、新增 `subtotal / shipping_fee / locked / paid_at / payment_deadline`、回填 subtotal
  - 狀態機服務 `order_state.py`：合法轉換表 + 庫存釋放 + 金額重算
  - 端點：`POST /orders/{id}/pay`（客戶付款）、`/cancel`（限付款前，釋放庫存）、`PUT /orders/{id}/status`（管理員，僅允許合法轉換；核對完成鎖定金額）
  - 前端：7 態標籤/進度（共用 `orderStatus.ts`）、admin 抽屜改「依狀態顯示動作」、MyOrders 串接真實付款/取消 API、修正付款文案為 48h
  - 驗證：migration（狀態重映 8 筆）、API 完整流程（核對→付款→入帳→出貨→完成、非法轉換擋下、取消釋放庫存）、tsc/build 通過、瀏覽器實測後台 7 態與進度條正常
- ✅ **P3 + P4 已完成**（2026-08-18，配送方式 + 人工核對運費）
  - 三種配送：`home_delivery`（宅配）/ `cvs_711`（7-11）/ `self_pickup`（自取）
  - 預設運費（config，可調）：宅配 100 / 7-11 60 / 自取 0；下單即帶預設，管理員核對時可調整
  - `PickupLocation` 自取地點 model + CRUD + 後台「自取點」分頁；下單時**快照**地點資訊
  - Migration `0005_p3_delivery`：orders 加 `delivery_method`（既有回填 home_delivery）+ 建 pickup_locations
  - 端點：`/pickup-locations` CRUD、`POST /orders/{id}/verify`（輸入運費、鎖定金額、review→payment）；`/status` 擋掉 review→payment（強制走 verify）
  - 前端：Checkout 配送方式切換 + 條件式欄位 + 運費/預估總計；OrderConfirm/MyOrders/AdminOrderDrawer 依方式顯示；後台抽屜「等待核對」提供運費輸入 + 核對完成
  - 驗證：backend 三方式 + 缺欄位擋下 + 自取快照 + verify 鎖定；tsc/build；瀏覽器實測 Checkout 三方式切換與運費即時更新
- ✅ **P5 已完成**（2026-08-20，庫存保留 + 48h 自動逾期）
  - 庫存帳務集中於 `order_state.py`：下單保留（reserved += qty）→ 確認入帳實扣（stock/reserved 同減）→ 取消/逾期釋放；準備出貨後取消則退回實體庫存
  - `verify` 進入等待付款時設 `payment_deadline = now + 48h`（`PAYMENT_DEADLINE_HOURS` 可調）
  - 逾期處理：`order_expiry.py` + main.py 背景排程（預設每 600 秒掃描）+ 付款端點惰性檢查（逾期擋下並自動標記 EXPIRED）
  - Migration `0006_p5_reservations`：進行中訂單由「已扣」轉「保留」（可售數不變）、等待付款單補 48h 寬限期限
  - 前端：MyOrders 等待付款顯示剩餘時間倒數（UTC 換算）
  - 驗證：7 情境全過（保留/實扣/退回/逾期釋放/逾期擋付款）；tsc/build 通過；排程啟動確認
- ✅ **P6 已完成**（2026-08-20，操作紀錄）
  - `AuditLog` model + Migration `0007`（動作/對象/前後內容 JSON/操作者/時間，全欄位索引）
  - 寫入點：帳號（建立/重設密碼/停用啟用）、商品（新增/異動/刪除）、SKU（價格/庫存異動含前後值）、訂單（核對含運費、狀態轉換、取消）
  - `GET /admin/audit-logs`：對象/動作篩選 + 摘要搜尋 + 分頁（僅管理員）
  - 3 個月自動清理：掛在既有背景排程（`cleanup_old_logs`）
  - 後台新增「操作紀錄」分頁：篩選 chips、搜尋、時間/操作者/動作/摘要表格、「差異」展開異動前後 JSON 對照
  - 驗證：9 種操作全數留痕（含 diff）、篩選/權限（403）/清理函式通過；tsc/build；瀏覽器實測分頁與差異展開

---

## 🎉 全部階段完成（P0–P6，2026-08-18 ～ 08-20）

需求書 V1.1 半自動版的核心範圍已全數實作：帳號管控、商品四層模型、
7 態訂單狀態機、三種配送、人工核對運費、庫存保留、48h 自動逾期、操作紀錄。
後續如需：品牌/類別/自取點異動納入稽核、多圖管理、後端分頁優化等，可作為增量迭代。
