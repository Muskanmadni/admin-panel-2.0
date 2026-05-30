from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from src.api import deps
from src.api.notifications import create_notification, notify_admins
from src.models import User
from src.models.employee import LeaveRequest

router = APIRouter()


class LeaveRequestIn(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: str
    days: int


class LeaveRequestOut(BaseModel):
    id: UUID
    employee_id: UUID
    type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    days: int
    created_at: datetime
    employee_name: str | None = None
    employee_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=LeaveRequestOut)
def create_leave(
    data: LeaveRequestIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    leave = LeaveRequest(
        employee_id=current_user.id,
        type=data.type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        days=data.days,
        status="pending",
    )
    db.add(leave)
    db.flush()
    emp_name = current_user.full_name or current_user.email
    notify_admins(
        db,
        message=(
            f'{emp_name} submitted a {data.type} leave request '
            f'({data.start_date} to {data.end_date}, {data.days} day(s)). Pending approval.'
        ),
        notification_type="leave_request",
        tenant_id=current_user.tenant_id,
    )
    db.commit()
    db.refresh(leave)
    return _to_out(leave, current_user)


@router.get("/my", response_model=List[LeaveRequestOut])
def my_leaves(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    rows = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_user.id
    ).order_by(LeaveRequest.created_at.desc()).all()
    return [_to_out(r, current_user) for r in rows]


@router.get("/all", response_model=List[LeaveRequestOut])
def all_leaves(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc()).all()
    result = []
    for r in rows:
        emp = db.query(User).filter(User.id == r.employee_id).first()
        result.append(_to_out(r, emp))
    return result


@router.patch("/{leave_id}/status")
def update_leave_status(
    leave_id: UUID,
    status: str = Query(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave.status = status
    create_notification(
        db,
        user_id=leave.employee_id,
        message=f"Your {leave.type} leave request ({leave.start_date} to {leave.end_date}) has been {status}.",
        notification_type="leave",
    )
    db.commit()
    return {"message": f"Leave {status}"}


def _to_out(leave: LeaveRequest, emp: User | None) -> dict:
    return {
        "id": leave.id,
        "employee_id": leave.employee_id,
        "type": leave.type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "reason": leave.reason,
        "status": leave.status,
        "days": leave.days,
        "created_at": leave.created_at,
        "employee_name": emp.full_name if emp else None,
        "employee_email": emp.email if emp else None,
    }
