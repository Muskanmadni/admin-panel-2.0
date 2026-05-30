from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from src.api import deps
from src.models import User
from src.models.employee import TimeLog, Employee

router = APIRouter()

ADMIN_ROLES = ("admin", "super_admin", "manager")


class TimeLogIn(BaseModel):
    project: str
    task: str
    tag: Optional[str] = None
    start_time: str   # ISO string
    end_time: str
    duration: int     # seconds


class TimeLogOut(BaseModel):
    id: UUID
    project: str
    task: str
    tag: Optional[str]
    start_time: str
    end_time: str
    duration: int

    model_config = ConfigDict(from_attributes=True)


class TimeLogAdminOut(BaseModel):
    id: UUID
    project: str
    task: str
    tag: Optional[str]
    start_time: str
    end_time: str
    duration: int
    duration_hours: float
    employee_id: UUID
    employee_name: str | None = None
    employee_email: str | None = None
    employee_department: str | None = None


class TimeLogStatsOut(BaseModel):
    total_hours_today: float
    total_hours_week: float
    total_logs: int
    active_employees: int


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")


def _parse_log_date(iso_str: str) -> date | None:
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(iso_str[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def _to_admin_out(log: TimeLog, emp: User | None, dept: str | None) -> dict:
    hours = round(log.duration / 3600, 2)
    name = None
    if emp:
        name = emp.full_name or (emp.email.split('@')[0] if emp.email else None)
    return {
        "id": log.id,
        "project": log.project,
        "task": log.task,
        "tag": log.tag,
        "start_time": log.start_time,
        "end_time": log.end_time,
        "duration": log.duration,
        "duration_hours": hours,
        "employee_id": log.employee_id,
        "employee_name": name,
        "employee_email": emp.email if emp else None,
        "employee_department": dept,
    }


@router.post("/", response_model=TimeLogOut)
def create_log(
    data: TimeLogIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    log = TimeLog(
        employee_id=current_user.id,
        project=data.project,
        task=data.task,
        tag=data.tag,
        start_time=data.start_time,
        end_time=data.end_time,
        duration=data.duration,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/my", response_model=List[TimeLogOut])
def my_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return (
        db.query(TimeLog)
        .filter(TimeLog.employee_id == current_user.id)
        .order_by(TimeLog.start_time.desc())
        .limit(100)
        .all()
    )


@router.delete("/{log_id}")
def delete_log(
    log_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    log = db.query(TimeLog).filter(TimeLog.id == log_id, TimeLog.employee_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"ok": True}


@router.get("/all", response_model=List[TimeLogAdminOut])
def all_logs(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    rows = db.query(TimeLog).order_by(TimeLog.start_time.desc()).limit(500).all()
    result = []
    start_d = date.fromisoformat(start_date) if start_date else None
    end_d = date.fromisoformat(end_date) if end_date else None
    dept_filter = department.lower() if department else None

    for log in rows:
        log_d = _parse_log_date(log.start_time)
        if start_d and log_d and log_d < start_d:
            continue
        if end_d and log_d and log_d > end_d:
            continue

        emp = db.query(User).filter(User.id == log.employee_id).first()
        emp_profile = db.query(Employee).filter(Employee.user_id == log.employee_id).first()
        dept = emp_profile.department if emp_profile else None

        if dept_filter and (dept or "").lower() != dept_filter:
            continue

        result.append(_to_admin_out(log, emp, dept))
    return result


@router.get("/stats", response_model=TimeLogStatsOut)
def time_log_stats(
    department: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    dept_filter = department.lower() if department else None

    rows = db.query(TimeLog).all()
    hours_today = 0.0
    hours_week = 0.0
    employee_ids: set[UUID] = set()

    for log in rows:
        emp_profile = db.query(Employee).filter(Employee.user_id == log.employee_id).first()
        dept = (emp_profile.department if emp_profile else "") or ""
        if dept_filter and dept.lower() != dept_filter:
            continue

        log_d = _parse_log_date(log.start_time)
        if not log_d:
            continue

        h = log.duration / 3600
        if log_d == today:
            hours_today += h
        if log_d >= week_start:
            hours_week += h
        employee_ids.add(log.employee_id)

    return {
        "total_hours_today": round(hours_today, 1),
        "total_hours_week": round(hours_week, 1),
        "total_logs": len(rows),
        "active_employees": len(employee_ids),
    }
