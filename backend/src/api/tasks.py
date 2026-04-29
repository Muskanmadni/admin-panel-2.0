from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api import deps
from src.schemas.task import Task, TaskCreate, TaskUpdate
from src.services.task import task_service
from src.models.models import User

router = APIRouter()

@router.post("/", response_model=Task)
def create_task(
    *,
    db: Session = Depends(deps.get_db),
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create new task.
    """
    return task_service.create(db, obj_in=task_in, current_user=current_user)

@router.get("/", response_model=List[Task])
def read_tasks(
    db: Session = Depends(deps.get_db),
    project_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Retrieve tasks.
    """
    tasks = task_service.get_multi(
        db, tenant_id=current_user.tenant_id, project_id=project_id, skip=skip, limit=limit
    )
    return tasks

@router.put("/{id}", response_model=Task)
def update_task(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    task_in: TaskUpdate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update a task.
    """
    task = task_service.get(db, id=id, tenant_id=current_user.tenant_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_service.update(db, db_obj=task, obj_in=task_in)
