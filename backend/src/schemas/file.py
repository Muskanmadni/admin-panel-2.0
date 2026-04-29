from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class FileBase(BaseModel):
    name: str
    file_type: Optional[str] = None
    size: Optional[int] = None

class FileUploadResponse(BaseModel):
    file_id: UUID
    upload_url: Optional[str] = None # For pre-signed URL uploads
    file_url: str

class File(FileBase):
    id: UUID
    tenant_id: UUID
    url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
