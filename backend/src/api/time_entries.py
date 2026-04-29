from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api import deps
from src.schemas.time_entry import TimeEntry, TimeEntryCreate
from src.services.time_entry import time_entry_service
from src.models.models import User

router = APIRouter()

@router.post("/start", response_model=TimeEntry)
def start_timer(
    *,
    db: Session = Depends(deps.get_db),
    time_in: TimeEntryCreate,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Start a new time entry.
    """
    return time_entry_service.start_timer(db, obj_in=time_in, current_user=current_user)

@router.post("/stop", response_model=TimeEntry)
def stop_timer(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Stop the active time entry.
    """
    return time_entry_service.stop_timer(db, current_user=current_user)

@router.get("/logs", response_model=List[TimeEntry])
def read_time_logs(
    db: Session = Depends(deps.get_db),
    user_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Retrieve time logs.
    """
    # If not admin or super_admin, can only see own logs unless specified otherwise
    if current_user.role not in ["admin", "super_admin"] and user_id and user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not enough permissions to view other users' logs")
    
    target_user_id = user_id or (current_user.id if current_user.role not in ["admin", "super_admin"] else None)

    logs = time_entry_service.get_multi(
        db, tenant_id=current_user.tenant_id, user_id=target_user_id, skip=skip, limit=limit
    )
    return logs
