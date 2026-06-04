from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    supabase_user_id: Optional[UUID]
    email: str
    full_name: Optional[str] = None
    user_type: str  # 'employee'
    role: str = "employee"
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    email: Optional[str] = None
    full_name: Optional[str] = None
    user_type: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

class User(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)