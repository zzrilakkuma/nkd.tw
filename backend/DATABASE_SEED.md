# 数据库种子数据说明

## 概述

`seed_data.py` 会在应用首次启动时自动运行，初始化数据库中的测试数据。

## 📊 包含的数据

### 👥 测试账号

#### 管理员账号
- **邮箱**: `admin@hookah-store.com`
- **密码**: `password`
- **权限**: 管理员（可管理商品、订单）

#### 普通用户账号
- **邮箱**: `customer@gmail.com`
- **密码**: `password`
- **权限**: 普通用户

### 🛍️ 商品数据

#### DarkSide 系列水烟草（10款）
- DarkSide Bergamonstr - 760元
- DarkSide Cosmo Flower - 760元
- DarkSide Dark Passion - 760元
- DarkSide Dark Supra - 760元
- DarkSide Lemon Blast - 760元
- DarkSide Needls - 760元
- DarkSide Pomelow - 760元
- DarkSide Red Alert - 760元
- DarkSide Supernova - 760元
- DarkSide Virgin Peach - 760元

#### Kalee 系列水烟草（1款）
- Kalee Grapefruit - 580元

#### 配件（2款）
- 椰殼碳 - 2000元
- MOD 矽膠水煙管 - 650元

**总计**: 13个商品

---

## 🚀 自动初始化

### Zeabur 部署时

数据库会在应用启动时自动初始化：

1. **创建数据表** - 根据模型自动创建所有表
2. **插入种子数据** - 添加测试账号和商品
3. **启动应用** - FastAPI 应用开始运行

**查看日志**：在 Zeabur 服务页面的 "Logs" 标签中可以看到：
```
🚀 Starting Hookah Store API...
⏳ Waiting for database to be ready...
📊 Initializing database tables...
✅ Tables created
🌱 Seeding database...
✅ 建立使用者: admin@hookah-store.com
✅ 建立使用者: customer@gmail.com
✅ 建立商品: DarkSide Bergamonstr
...
✨ Starting FastAPI application...
```

### 手动运行种子脚本

如果需要手动重新初始化数据：

1. 进入 Zeabur 后端服务的 Terminal
2. 运行命令：
   ```bash
   python seed_data.py
   ```

---

## ⚠️ 注意事项

### 数据不会重复插入

脚本会检查数据是否已存在：
- **用户**: 通过 email 检查
- **商品**: 通过 id 检查

如果数据已存在，会显示：
```
⏭️ 使用者已存在: admin@hookah-store.com
⏭️ 商品已存在: DarkSide Bergamonstr
```

### 生产环境建议

**🔴 重要**：在生产环境部署前，请修改默认密码！

1. 修改 `seed_data.py` 中的密码
2. 或部署后通过管理界面修改
3. 考虑移除测试账号

### 自定义种子数据

如需添加更多初始数据，编辑 `backend/seed_data.py`：

```python
# 添加更多商品
Product(
    id="14",
    name="新商品名称",
    description="商品描述",
    price=999,
    image="/images/product.jpg",
    stock=50,
    category="水煙草"
)
```

---

## 🔍 验证数据

部署完成后，访问：

- **API 文档**: `https://your-backend.zeabur.app/api/v1/docs`
- **商品列表**: `https://your-backend.zeabur.app/api/v1/products`
- **健康检查**: `https://your-backend.zeabur.app/health`

使用测试账号登录前端进行验证。
