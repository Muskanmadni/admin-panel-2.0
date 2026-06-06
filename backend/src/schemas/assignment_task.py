from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class GeneratedTaskItem(BaseModel):
    title: str
    description: Optional[str] = None


class GeneratedTasksResponse(BaseModel):
    tasks: List[GeneratedTaskItem]


class ProjectTaskOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str] = None
    is_completed: bool
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sort_order: Optional[int] = None
