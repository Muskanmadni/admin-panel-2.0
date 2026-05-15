from typing import List
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from src.api import deps
from src.models import User
from src.models.employee import Attendance

router = APIRouter()


class AttendanceOut(BaseModel):
    id: UUID
    date: str
    check_in: str | None
    check_out: str | None
    status: str
    hours: float
    employee_name: str | None = None
    employee_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceIn(BaseModel):
    date: str | None = None  # client local date YYYY-MM-DD; falls back to server date


def _time_now() -> str:
    return datetime.now().strftime("%H:%M")


def _today() -> str:
    return date.today().isoformat()


@router.post("/check-in", response_model=AttendanceOut)
def check_in(
    data: AttendanceIn = AttendanceIn(),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    today = data.date or _today()
    existing = db.query(Attendance).filter(
        Attendance.employee_id == current_user.id,
        Attendance.date == today
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    if existing:
        existing.check_in = _time_now()
        db.commit()
        db.refresh(existing)
        return existing

    record = Attendance(
        employee_id=current_user.id,
        date=today,
        check_in=_time_now(),
        status="present",
        hours=0.0,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/check-out", response_model=AttendanceOut)
def check_out(
    data: AttendanceIn = AttendanceIn(),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    today = data.date or _today()
    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.id,
        Attendance.date == today
    ).first()
    if not record or not record.check_in:
        raise HTTPException(status_code=400, detail="No check-in found for today")
    if record.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")

    now = _time_now()
    record.check_out = now
    try:
        ci = datetime.strptime(f"{today} {record.check_in}", "%Y-%m-%d %H:%M")
        co = datetime.strptime(f"{today} {now}", "%Y-%m-%d %H:%M")
        record.hours = round((co - ci).seconds / 3600, 2)
    except Exception:
        record.hours = 0.0
    db.commit()
    db.refresh(record)
    return record


@router.get("/my", response_model=List[AttendanceOut])
def my_attendance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return db.query(Attendance).filter(
        Attendance.employee_id == current_user.id
    ).order_by(Attendance.date.desc()).limit(30).all()


@router.get("/all", response_model=List[AttendanceOut])
def all_attendance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = db.query(Attendance).order_by(Attendance.date.desc()).limit(200).all()
    result = []
    for r in rows:
        emp = db.query(User).filter(User.id == r.employee_id).first()
        result.append({
            "id": r.id, "date": r.date, "check_in": r.check_in,
            "check_out": r.check_out, "status": r.status, "hours": r.hours,
            "employee_name": emp.full_name if emp else None,
            "employee_email": emp.email if emp else None,
        })
    return result
