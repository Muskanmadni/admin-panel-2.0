from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api import deps
from src.schemas.project import Project, ProjectCreate, ProjectUpdate
from src.services.project import project_service
from src.models.models import User

router = APIRouter()

@router.post("/", response_model=Project)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create new project.
    """
    return project_service.create(db, obj_in=project_in, current_user=current_user)

@router.get("/", response_model=List[Project])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Retrieve projects.
    """
    projects = project_service.get_multi(
        db, tenant_id=current_user.tenant_id, skip=skip, limit=limit
    )
    return projects

@router.get("/{id}", response_model=Project)
def read_project(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get project by ID.
    """
    project = project_service.get(db, id=id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{id}", response_model=Project)
def update_project(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update a project.
    """
    project = project_service.get(db, id=id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_service.update(db, db_obj=project, obj_in=project_in)

@router.delete("/{id}", response_model=Project)
def delete_project(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Delete a project.
    """
    return project_service.remove(db, id=id, tenant_id=current_user.tenant_id)
