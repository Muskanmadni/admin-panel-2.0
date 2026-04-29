from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OrganizationalUserBase(BaseModel):
    user_id: UUID
    tenant_id: UUID
    department: Optional[str] = None
    position: Optional[str] = None

class OrganizationalUserCreate(OrganizationalUserBase):
    pass

class OrganizationalUserUpdate(OrganizationalUserBase):
    department: Optional[str] = None
    position: Optional[str] = None

class OrganizationalUser(OrganizationalUserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)