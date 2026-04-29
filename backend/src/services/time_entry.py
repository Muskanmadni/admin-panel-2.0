from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.models.models import TimeEntry, User, Task
from src.schemas.time_entry import TimeEntryCreate

class TimeEntryService:
    def start_timer(self, db: Session, *, obj_in: TimeEntryCreate, current_user: User) -> TimeEntry:
        # Check if user already has an active timer
        active_timer = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.end_time == None
        ).first()
        if active_timer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active timer"
            )

        # Verify task exists and belongs to the same tenant
        task = db.query(Task).filter(
            Task.id == obj_in.task_id,
            Task.tenant_id == current_user.tenant_id
        ).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        db_obj = TimeEntry(
            task_id=obj_in.task_id,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            start_time=datetime.now(timezone.utc)
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def stop_timer(self, db: Session, *, current_user: User) -> TimeEntry:
        active_timer = db.query(TimeEntry).filter(
            TimeEntry.user_id == current_user.id,
            TimeEntry.end_time == None
        ).first()
        if not active_timer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active timer found"
            )

        end_time = datetime.now(timezone.utc)
        duration = int((end_time - active_timer.start_time.replace(tzinfo=timezone.utc)).total_seconds())

        active_timer.end_time = end_time
        active_timer.duration = duration
        
        db.add(active_timer)
        db.commit()
        db.refresh(active_timer)
        return active_timer

    def get_multi(
        self, db: Session, *, tenant_id: UUID, user_id: Optional[UUID] = None, skip: int = 0, limit: int = 100
    ) -> List[TimeEntry]:
        query = db.query(TimeEntry).filter(TimeEntry.tenant_id == tenant_id)
        if user_id:
            query = query.filter(TimeEntry.user_id == user_id)
        return query.order_by(TimeEntry.start_time.desc()).offset(skip).limit(limit).all()

time_entry_service = TimeEntryService()
