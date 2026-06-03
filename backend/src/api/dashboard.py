from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.api import deps
from src.models.models import User
from src.models.workflow import Project
from src.models.employee import (
    ActivityLog,
    LeaveRequest,
    Announcement,
    EmployeeProject,
    TimeLog,
)

router = APIRouter()

ADMIN_ROLES = ("admin", "super_admin", "manager")
CLEAR_ROLES = ("admin", "super_admin")


class ActivityLogIn(BaseModel):
    action: str = Field(..., min_length=1, max_length=50)
    section: str = Field(..., min_length=1, max_length=100)
    details: Optional[str] = Field(None, max_length=500)


def _iso(dt: datetime | None) -> str:
    if not dt:
        return datetime.utcnow().isoformat() + "Z"
    return dt.isoformat()


def _activity_row(log: ActivityLog) -> dict[str, Any]:
    return {
        "id": str(log.id),
        "user_id": str(log.user_id),
        "user_email": log.user_email,
        "action": log.action,
        "section": log.section,
        "details": log.details,
        "created_at": _iso(log.created_at),
    }


def _supplemental_activity(db: Session, limit: int) -> List[dict[str, Any]]:
    """Build feed entries from recent app data when explicit logs are sparse."""
    events: List[dict[str, Any]] = []

    leaves = (
        db.query(LeaveRequest, User)
        .join(User, LeaveRequest.employee_id == User.id)
        .order_by(LeaveRequest.created_at.desc())
        .limit(limit)
        .all()
    )
    for leave, user in leaves:
        events.append({
            "id": f"leave-{leave.id}",
            "user_id": str(user.id),
            "user_email": user.email,
            "action": leave.status,
            "section": "Leave",
            "details": f"{leave.type} leave request ({leave.days} day{'s' if leave.days != 1 else ''})",
            "created_at": _iso(leave.created_at),
        })

    announcements = (
        db.query(Announcement, User)
        .join(User, Announcement.created_by == User.id)
        .filter(Announcement.status == "published")
        .order_by(Announcement.created_at.desc())
        .limit(limit)
        .all()
    )
    for ann, user in announcements:
        events.append({
            "id": f"announcement-{ann.id}",
            "user_id": str(user.id),
            "user_email": user.email,
            "action": "published",
            "section": "Announcements",
            "details": ann.title,
            "created_at": _iso(ann.created_at),
        })

    assignments = (
        db.query(EmployeeProject, User)
        .join(User, EmployeeProject.employee_id == User.id)
        .order_by(EmployeeProject.created_at.desc())
        .limit(limit)
        .all()
    )
    for assignment, user in assignments:
        events.append({
            "id": f"assignment-{assignment.id}",
            "user_id": str(user.id),
            "user_email": user.email,
            "action": assignment.status,
            "section": "Assignments",
            "details": f"Project assignment ({assignment.status})",
            "created_at": _iso(assignment.created_at),
        })

    time_logs = (
        db.query(TimeLog, User)
        .join(User, TimeLog.employee_id == User.id)
        .order_by(TimeLog.created_at.desc())
        .limit(limit)
        .all()
    )
    for entry, user in time_logs:
        hours = round(entry.duration / 3600, 1)
        events.append({
            "id": f"timelog-{entry.id}",
            "user_id": str(user.id),
            "user_email": user.email,
            "action": "logged",
            "section": "Time Tracking",
            "details": f"{entry.project} — {entry.task} ({hours}h)",
            "created_at": _iso(entry.created_at),
        })

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events[:limit]


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    tenant_id = current_user.tenant_id

    def tenant_filter(q, model):
        if tenant_id:
            return q.filter(model.tenant_id == tenant_id)
        return q

    total_users = tenant_filter(db.query(User), User).count()
    total_projects = tenant_filter(db.query(Project), Project).count()
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()

    return {
        "totalUsers": total_users,
        "totalProjects": total_projects,
        "totalTasks": 0,
        "activeTasks": 0,
        "pendingActions": pending_leaves,
        "usersTrend": "+0% this month",
        "projectsTrend": f"{total_projects} total",
        "activeTasksTrend": "N/A",
        "pendingActionsTrend": f"{pending_leaves} urgent"
    }


@router.get("/activity")
def get_activity_feed(
    limit: int = Query(8, ge=1, le=50),
    include_supplemental: bool = Query(True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    q = db.query(ActivityLog).order_by(ActivityLog.created_at.desc())
    if current_user.tenant_id:
        q = q.filter(ActivityLog.tenant_id == current_user.tenant_id)

    logs = q.limit(limit).all()
    events = [_activity_row(log) for log in logs]

    if include_supplemental and len(events) < limit:
        existing_ids = {e["id"] for e in events}
        for item in _supplemental_activity(db, limit * 2):
            if item["id"] not in existing_ids:
                events.append(item)
                existing_ids.add(item["id"])
            if len(events) >= limit:
                break

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events[:limit]


@router.delete("/activity")
def clear_activity_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role not in CLEAR_ROLES:
        raise HTTPException(status_code=403, detail="Only admins can clear activity logs")

    q = db.query(ActivityLog)
    if current_user.tenant_id:
        q = q.filter(ActivityLog.tenant_id == current_user.tenant_id)

    deleted = q.delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted, "message": "Activity log cleared"}


@router.post("/activity", status_code=201)
def create_activity_log(
    body: ActivityLogIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    row = ActivityLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=body.action,
        section=body.section,
        details=body.details,
        tenant_id=current_user.tenant_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _activity_row(row)
