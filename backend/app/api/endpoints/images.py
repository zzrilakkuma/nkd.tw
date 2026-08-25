from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.image import Image
from app.models.user import User
from app.api.dependencies import get_current_admin_user

router = APIRouter()

MAX_SIZE = 3 * 1024 * 1024  # 3MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """管理員上傳商品圖片，回傳可直接使用的圖片路徑。"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"不支援的圖片格式（{file.content_type}），請使用 JPG / PNG / WebP / GIF",
        )
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="檔案是空的")
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="圖片不可超過 3MB，請先壓縮")

    image = Image(
        id=str(uuid.uuid4()),
        filename=file.filename,
        content_type=file.content_type,
        size=len(data),
        data=data,
    )
    db.add(image)
    db.commit()

    return {"id": image.id, "url": f"/api/v1/images/{image.id}", "size": image.size}


@router.get("/{image_id}")
def get_image(image_id: str, db: Session = Depends(get_db)):
    """公開讀取圖片（含快取標頭）。"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="圖片不存在")
    return Response(
        content=image.data,
        media_type=image.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
