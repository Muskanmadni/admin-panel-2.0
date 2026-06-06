import json
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.api import deps
from src.models import User
from src.models.workflow import Project
from src.schemas.workflow import ProjectCreate, ProjectUpdate, ProjectResponse
from src.schemas.assignment_task import ProjectTaskOut, ProjectTaskCreate
from src.models.employee import ProjectTask
from src.services.project_task import generate_tasks_for_project, get_project_tasks

router = APIRouter()


def _require_admin(current_user: User) -> None:
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")


def _serialize(project: Project, payload_dict: dict) -> None:
    """Serialize list fields to JSON strings for DB storage."""
    for field in ("team", "tags"):
        if field in payload_dict and isinstance(payload_dict[field], list):
            payload_dict[field] = json.dumps(payload_dict[field])


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return db.query(Project).all()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    data = payload.model_dump()
    _serialize(None, data)
    project = Project(**data, tenant_id=current_user.tenant_id, created_by=current_user.id, owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = payload.model_dump(exclude_unset=True)
    _serialize(None, data)
    for field, value in data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}/tasks", response_model=List[ProjectTaskOut])
def list_project_tasks(
    project_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return get_project_tasks(db, project_id)


@router.post("/{project_id}/tasks", response_model=ProjectTaskOut, status_code=status.HTTP_201_CREATED)
def create_project_task(
    project_id: UUID,
    payload: ProjectTaskCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sort_order = payload.sort_order
    if sort_order is None:
        max_sort = db.query(func.max(ProjectTask.sort_order)).filter(ProjectTask.project_id == project_id).scalar()
        sort_order = (max_sort or -1) + 1

    task = ProjectTask(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        sort_order=sort_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{project_id}/generate-tasks", response_model=List[ProjectTaskOut])
async def generate_project_tasks(
    project_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = get_project_tasks(db, project_id)
    if existing:
        raise HTTPException(status_code=400, detail="Tasks already exist for this project")

    try:
        await generate_tasks_for_project(db, project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    db.commit()
    return get_project_tasks(db, project_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
