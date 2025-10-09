from fastapi import APIRouter
from app.api.endpoints import auth, products, orders

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["認證"])
api_router.include_router(products.router, prefix="/products", tags=["商品"])
api_router.include_router(orders.router, prefix="/orders", tags=["訂單"])
