from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TimeEntryBase(BaseModel):
    task_id: UUID

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntry(TimeEntryBase):
    id: UUID
    user_id: UUID
    tenant_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None # in seconds
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
