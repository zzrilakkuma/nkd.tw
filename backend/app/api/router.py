from fastapi import APIRouter
from app.api.endpoints import auth, products, orders, admin_users, brands, categories, pickup_locations, audit_logs, images

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["認證"])
api_router.include_router(admin_users.router, prefix="/admin/users", tags=["管理員-帳號"])
api_router.include_router(audit_logs.router, prefix="/admin/audit-logs", tags=["管理員-操作紀錄"])
api_router.include_router(brands.router, prefix="/brands", tags=["品牌"])
api_router.include_router(categories.router, prefix="/categories", tags=["類別"])
api_router.include_router(pickup_locations.router, prefix="/pickup-locations", tags=["自取地點"])
api_router.include_router(images.router, prefix="/images", tags=["圖片"])
api_router.include_router(products.router, prefix="/products", tags=["商品"])
api_router.include_router(orders.router, prefix="/orders", tags=["訂單"])
