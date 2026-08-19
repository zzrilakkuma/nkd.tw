from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.product import Product, SKU
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    SKUCreate,
    SKUUpdate,
    SKUResponse,
)
from app.api.dependencies import get_current_admin_user
from app.services.audit import log_action, diff_fields

router = APIRouter()


def _get_product_or_404(db: Session, product_id: str) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="商品不存在")
    return product


# ---------------- 公開：商品瀏覽 ----------------

@router.get("", response_model=List[ProductResponse])
def get_products(
    brand_id: Optional[str] = None,
    category_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """公開商品列表（僅上架商品，依品牌/類別篩選）"""
    query = db.query(Product).filter(Product.is_published == True)  # noqa: E712
    if brand_id:
        query = query.filter(Product.brand_id == brand_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.all()


@router.get("/admin/all", response_model=List[ProductResponse])
def get_all_products(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """管理員：所有商品（含未上架）"""
    return db.query(Product).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    return _get_product_or_404(db, product_id)


# ---------------- 管理員：商品 CRUD ----------------

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    payload = data.model_dump()
    skus_data = payload.pop("skus", None) or []

    product = Product(id=str(uuid.uuid4()), **payload)
    for s in skus_data:
        product.skus.append(SKU(id=str(uuid.uuid4()), **s))

    db.add(product)
    log_action(
        db, admin, "PRODUCT_CREATE", "product", product.id,
        summary=f"新增商品「{product.name}」（含 {len(product.skus)} 個 SKU）",
        after={"name": product.name, "is_published": product.is_published},
    )
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = _get_product_or_404(db, product_id)
    update = data.model_dump(exclude_unset=True)
    old = {f: getattr(product, f) for f in update}
    for field, value in update.items():
        setattr(product, field, value)
    before, after = diff_fields(old, update)
    if after:
        log_action(
            db, admin, "PRODUCT_UPDATE", "product", product.id,
            summary=f"更新商品「{product.name}」：" + "、".join(after.keys()),
            before=before, after=after,
        )
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = _get_product_or_404(db, product_id)
    log_action(
        db, admin, "PRODUCT_DELETE", "product", product.id,
        summary=f"刪除商品「{product.name}」",
        before={"name": product.name},
    )
    db.delete(product)
    db.commit()
    return {"message": "商品已刪除"}


# ---------------- 管理員：SKU CRUD（掛在商品下） ----------------

@router.post("/{product_id}/skus", response_model=SKUResponse, status_code=status.HTTP_201_CREATED)
def create_sku(
    product_id: str,
    data: SKUCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    product = _get_product_or_404(db, product_id)
    sku = SKU(id=str(uuid.uuid4()), product_id=product_id, **data.model_dump())
    db.add(sku)
    log_action(
        db, admin, "SKU_CREATE", "sku", sku.id,
        summary=f"「{product.name}」新增規格（售價 {sku.price:.0f}／庫存 {sku.stock}）",
        after={"flavor": sku.flavor, "spec": sku.spec, "price": sku.price, "stock": sku.stock},
    )
    db.commit()
    db.refresh(sku)
    return sku


@router.put("/{product_id}/skus/{sku_id}", response_model=SKUResponse)
def update_sku(
    product_id: str,
    sku_id: str,
    data: SKUUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    sku = db.query(SKU).filter(SKU.id == sku_id, SKU.product_id == product_id).first()
    if not sku:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="SKU 不存在")
    update = data.model_dump(exclude_unset=True)
    old = {f: getattr(sku, f) for f in update}
    for field, value in update.items():
        setattr(sku, field, value)
    before, after = diff_fields(old, update)
    if after:
        product = db.query(Product).filter(Product.id == product_id).first()
        pname = product.name if product else product_id
        label = "價格/庫存" if ("price" in after or "stock" in after) else "規格"
        log_action(
            db, admin, "SKU_UPDATE", "sku", sku.id,
            summary=f"「{pname}」{label}異動：" + "、".join(f"{k} {before[k]}→{after[k]}" for k in after),
            before=before, after=after,
        )
    db.commit()
    db.refresh(sku)
    return sku


@router.delete("/{product_id}/skus/{sku_id}")
def delete_sku(
    product_id: str,
    sku_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    sku = db.query(SKU).filter(SKU.id == sku_id, SKU.product_id == product_id).first()
    if not sku:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="SKU 不存在")
    sku_label = " / ".join(x for x in [sku.flavor, sku.spec] if x) or "預設"
    log_action(
        db, admin, "SKU_DELETE", "sku", sku.id,
        summary=f"刪除規格（{sku_label}）",
        before={"flavor": sku.flavor, "spec": sku.spec, "price": sku.price, "stock": sku.stock},
    )
    db.delete(sku)
    db.commit()
    return {"message": "SKU 已刪除"}
