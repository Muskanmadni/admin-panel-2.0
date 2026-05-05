import json
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    assignee: Optional[str] = None
    team: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    progress: int = 0
    budget: Optional[float] = None
    tags: List[str] = []
    client: Optional[str] = None
    category: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    team: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    progress: Optional[int] = None
    budget: Optional[float] = None
    tags: Optional[List[str]] = None
    client: Optional[str] = None
    category: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    priority: str
    assignee: Optional[str]
    team: List[str] = []
    start_date: Optional[str]
    end_date: Optional[str]
    progress: int
    budget: Optional[float]
    tags: List[str] = []
    client: Optional[str]
    category: Optional[str]
    tenant_id: Optional[UUID]
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("team", "tags", mode="before")
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []
