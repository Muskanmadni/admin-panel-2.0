from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.models.models import Project, User
from src.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    def create(self, db: Session, *, obj_in: ProjectCreate, current_user: User) -> Project:
        db_obj = Project(
            name=obj_in.name,
            description=obj_in.description,
            tenant_id=current_user.tenant_id,
            owner_id=current_user.id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi(
        self, db: Session, *, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        return db.query(Project).filter(Project.tenant_id == tenant_id).offset(skip).limit(limit).all()

    def get(self, db: Session, *, id: UUID, tenant_id: UUID) -> Optional[Project]:
        return db.query(Project).filter(Project.id == id, Project.tenant_id == tenant_id).first()

    def update(
        self, db: Session, *, db_obj: Project, obj_in: ProjectUpdate
    ) -> Project:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: UUID, tenant_id: UUID) -> Project:
        obj = db.query(Project).filter(Project.id == id, Project.tenant_id == tenant_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Project not found")
        db.delete(obj)
        db.commit()
        return obj

project_service = ProjectService()
