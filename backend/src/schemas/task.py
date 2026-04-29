from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    due_date: Optional[datetime] = None
    assigned_user_id: Optional[UUID] = None

class TaskCreate(TaskBase):
    project_id: UUID

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None

class Task(TaskBase):
    id: UUID
    project_id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
