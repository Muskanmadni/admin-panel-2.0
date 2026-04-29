from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.models.models import Task, User, Project
from src.schemas.task import TaskCreate, TaskUpdate
from src.worker import notify_task_assignment

class TaskService:
    def create(self, db: Session, *, obj_in: TaskCreate, current_user: User) -> Task:
        # Verify project exists and belongs to the same tenant
        project = db.query(Project).filter(
            Project.id == obj_in.project_id, 
            Project.tenant_id == current_user.tenant_id
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Verify assigned user belongs to the same tenant if provided
        assigned_user = None
        if obj_in.assigned_user_id:
            assigned_user = db.query(User).filter(
                User.id == obj_in.assigned_user_id,
                User.tenant_id == current_user.tenant_id
            ).first()
            if not assigned_user:
                raise HTTPException(status_code=404, detail="Assigned user not found in this tenant")

        db_obj = Task(
            title=obj_in.title,
            description=obj_in.description,
            status=obj_in.status,
            due_date=obj_in.due_date,
            project_id=obj_in.project_id,
            assigned_user_id=obj_in.assigned_user_id,
            tenant_id=current_user.tenant_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        if assigned_user:
            notify_task_assignment.delay(
                user_email=assigned_user.email,
                user_fcm_token=assigned_user.fcm_token,
                task_title=db_obj.title
            )

        return db_obj

    def get_multi(
        self, 
        db: Session, 
        *, 
        tenant_id: UUID, 
        project_id: Optional[UUID] = None, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Task]:
        query = db.query(Task).filter(Task.tenant_id == tenant_id)
        if project_id:
            query = query.filter(Task.project_id == project_id)
        return query.offset(skip).limit(limit).all()

    def get(self, db: Session, *, id: UUID, tenant_id: UUID) -> Optional[Task]:
        return db.query(Task).filter(Task.id == id, Task.tenant_id == tenant_id).first()

    def update(
        self, db: Session, *, db_obj: Task, obj_in: TaskUpdate
    ) -> Task:
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # If project_id is being updated, verify it exists and belongs to the same tenant
        if "project_id" in update_data:
            project = db.query(Project).filter(
                Project.id == update_data["project_id"], 
                Project.tenant_id == db_obj.tenant_id
            ).first()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

        # If assigned_user_id is being updated, verify it exists and belongs to the same tenant
        if "assigned_user_id" in update_data and update_data["assigned_user_id"]:
            assigned_user = db.query(User).filter(
                User.id == update_data["assigned_user_id"],
                User.tenant_id == db_obj.tenant_id
            ).first()
            if not assigned_user:
                raise HTTPException(status_code=404, detail="Assigned user not found in this tenant")

        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: UUID, tenant_id: UUID) -> Task:
        obj = db.query(Task).filter(Task.id == id, Task.tenant_id == tenant_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(obj)
        db.commit()
        return obj

task_service = TaskService()
