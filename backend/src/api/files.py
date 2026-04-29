from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from src.api import deps
from src.services.file import file_service
from src.schemas.file import File as FileSchema, FileUploadResponse
from src.models.models import User

router = APIRouter()

@router.post("/upload", response_model=FileSchema)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Upload a file to S3 and store metadata in DB.
    """
    try:
        return file_service.upload_file(db, file, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/presigned-url")
async def get_presigned_url(
    file_name: str,
    file_type: str,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Generate a pre-signed URL for client-side upload.
    """
    url, object_name = file_service.generate_presigned_url(
        file_name, file_type, current_user.tenant_id
    )
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate pre-signed URL")
    
    return {
        "upload_url": url,
        "object_name": object_name
    }
