from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from src.api import deps
from src.models.workflow import Project
from src.models.models import User

router = APIRouter()

class ProjectOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    priority: str
    progress: int
    end_date: Optional[str] = None
    tenant_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    progress: int = 0
    end_date: Optional[str] = None

@router.get("/", response_model=List[ProjectOut])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    return db.query(Project).filter(
        Project.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()

@router.post("/", response_model=ProjectOut)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        status=project_in.status,
        priority=project_in.priority,
        progress=project_in.progress,
        end_date=project_in.end_date,
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
