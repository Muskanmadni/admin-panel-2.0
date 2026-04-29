from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class IndividualUserBase(BaseModel):
    user_id: UUID
    phone_number: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None

class IndividualUserCreate(IndividualUserBase):
    pass

class IndividualUserUpdate(IndividualUserBase):
    phone_number: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None

class IndividualUser(IndividualUserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)