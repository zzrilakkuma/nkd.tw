"""P1 catalog refactor: brands / categories / products / skus

Revision ID: 0003_p1_catalog
Revises: 0002_p0_account_controls
Create Date: 2026-08-18

將扁平 Product（price/stock/category 字串）重構為四層：
  Brand / Category / Product / SKU
並將舊資料搬移：
  - 每個不同的 category 字串 → 一筆 Category
  - 建立一個預設 Brand「未指定品牌」
  - 每個舊 Product → 保留 Product（改掛 brand_id/category_id/main_image）
    並建立一個承接原 price/stock 的預設 SKU
  - order_items.sku_id 回填為對應的預設 SKU（歷史訂單）
"""
from typing import Sequence, Union
from datetime import datetime
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "0003_p1_catalog"
down_revision: Union[str, None] = "0002_p0_account_controls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uid() -> str:
    return str(uuid.uuid4())


def upgrade() -> None:
    bind = op.get_bind()

    # 1) 新資料表 -------------------------------------------------------------
    op.create_table(
        "brands",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_brands_id", "brands", ["id"])

    op.create_table(
        "categories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_id", "categories", ["id"])

    op.create_table(
        "skus",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("product_id", sa.String(), nullable=False),
        sa.Column("flavor", sa.String(), nullable=True),
        sa.Column("spec", sa.String(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_skus_id", "skus", ["id"])
    op.create_index("ix_skus_product_id", "skus", ["product_id"])

    # 2) products 新增欄位（先可為空，資料搬移後再視需要收斂） ----------------
    op.add_column("products", sa.Column("brand_id", sa.String(), nullable=True))
    op.add_column("products", sa.Column("category_id", sa.String(), nullable=True))
    op.add_column("products", sa.Column("main_image", sa.String(), nullable=True))
    op.add_column("products", sa.Column("images", sa.JSON(), nullable=True))
    op.add_column(
        "products",
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("products", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.create_index("ix_products_brand_id", "products", ["brand_id"])
    op.create_index("ix_products_category_id", "products", ["category_id"])

    # 3) order_items 新增 sku_id --------------------------------------------
    op.add_column("order_items", sa.Column("sku_id", sa.String(), nullable=True))

    # 4) 資料搬移 -----------------------------------------------------------
    now = datetime.utcnow()

    # 4a) 預設品牌
    default_brand_id = _uid()
    bind.execute(
        sa.text(
            "INSERT INTO brands (id, name, sort_order, is_active) "
            "VALUES (:id, :name, :so, :active)"
        ),
        {"id": default_brand_id, "name": "未指定品牌", "so": 0, "active": True},
    )

    # 4b) 由既有 category 字串建立 Category，建立 名稱 -> id 對照
    rows = bind.execute(
        sa.text("SELECT DISTINCT category FROM products WHERE category IS NOT NULL")
    ).fetchall()
    category_map = {}
    for i, (cat_name,) in enumerate(rows):
        cid = _uid()
        category_map[cat_name] = cid
        bind.execute(
            sa.text(
                "INSERT INTO categories (id, name, sort_order, is_active) "
                "VALUES (:id, :name, :so, :active)"
            ),
            {"id": cid, "name": cat_name, "so": i, "active": True},
        )

    # 4c) 逐一處理舊 product：更新新欄位 + 建立預設 SKU + 回填 order_items
    products = bind.execute(
        sa.text("SELECT id, price, stock, category, image FROM products")
    ).fetchall()
    for pid, price, stock, category, image in products:
        bind.execute(
            sa.text(
                "UPDATE products SET brand_id=:b, category_id=:c, main_image=:img, "
                "is_published=:pub, created_at=:ts WHERE id=:id"
            ),
            {
                "b": default_brand_id,
                "c": category_map.get(category),
                "img": image,
                "pub": True,
                "ts": now,
                "id": pid,
            },
        )
        sid = _uid()
        bind.execute(
            sa.text(
                "INSERT INTO skus (id, product_id, flavor, spec, unit, price, stock, reserved, is_active) "
                "VALUES (:id, :pid, :flavor, :spec, :unit, :price, :stock, :reserved, :active)"
            ),
            {
                "id": sid,
                "pid": pid,
                "flavor": "",
                "spec": "",
                "unit": "件",
                "price": price if price is not None else 0,
                "stock": stock if stock is not None else 0,
                "reserved": 0,
                "active": True,
            },
        )
        # 歷史訂單項目回填 sku_id
        bind.execute(
            sa.text("UPDATE order_items SET sku_id=:sid WHERE product_id=:pid"),
            {"sid": sid, "pid": pid},
        )

    # 5) 移除 products 舊欄位 ------------------------------------------------
    # 先移除舊 category 欄位上的索引，否則 SQLite batch 重建表時會嘗試重建
    # 指向已刪除欄位的索引而失敗。
    op.drop_index("ix_products_category", table_name="products")
    with op.batch_alter_table("products") as batch:
        batch.drop_column("price")
        batch.drop_column("stock")
        batch.drop_column("category")
        batch.drop_column("image")


def downgrade() -> None:
    # 還原舊欄位（資料無法完整回復，僅還原結構 + 由預設 SKU 回填價格/庫存）
    op.add_column("products", sa.Column("price", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("stock", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("category", sa.String(), nullable=True))
    op.add_column("products", sa.Column("image", sa.String(), nullable=True))

    bind = op.get_bind()
    # 由第一個 SKU 回填 price/stock
    bind.execute(
        sa.text(
            "UPDATE products SET "
            "price = (SELECT price FROM skus WHERE skus.product_id = products.id LIMIT 1), "
            "stock = (SELECT stock FROM skus WHERE skus.product_id = products.id LIMIT 1), "
            "image = main_image, "
            "category = (SELECT name FROM categories WHERE categories.id = products.category_id)"
        )
    )
    op.create_index("ix_products_category", "products", ["category"])

    op.drop_column("order_items", "sku_id")
    with op.batch_alter_table("products") as batch:
        batch.drop_index("ix_products_category_id")
        batch.drop_index("ix_products_brand_id")
        batch.drop_column("created_at")
        batch.drop_column("is_published")
        batch.drop_column("images")
        batch.drop_column("main_image")
        batch.drop_column("category_id")
        batch.drop_column("brand_id")

    op.drop_table("skus")
    op.drop_table("categories")
    op.drop_table("brands")
