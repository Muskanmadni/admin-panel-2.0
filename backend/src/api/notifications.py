from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from src.api import deps
from src.models import User
from src.models.employee import Notification

router = APIRouter()

ADMIN_ROLES = ("admin", "super_admin", "manager")


class NotificationOut(BaseModel):
    id: UUID
    message: str
    is_read: bool
    notification_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


def infer_notification_type(message: str, explicit: str | None = None) -> str:
    if explicit:
        return explicit
    lower = message.lower()
    if "leave" in lower:
        return "leave"
    if "project" in lower or "assigned" in lower:
        return "project"
    return "general"


def notify_admins(
    db: Session,
    *,
    message: str,
    notification_type: str,
    tenant_id: UUID | None = None,
) -> None:
    """Create the same notification for every admin/manager (optionally scoped by tenant)."""
    query = db.query(User).filter(User.role.in_(ADMIN_ROLES))
    admins = (
        query.filter(User.tenant_id == tenant_id).all()
        if tenant_id is not None
        else query.all()
    )
    if tenant_id is not None and not admins:
        admins = query.all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            message=message,
            notification_type=notification_type,
        )


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    message: str,
    notification_type: str = "general",
) -> Notification:
    notif = Notification(
        user_id=user_id,
        message=message[:500],
        notification_type=notification_type,
        is_read=False,
    )
    db.add(notif)
    return notif


def _to_out(row: Notification) -> dict:
    ntype = getattr(row, "notification_type", None) or infer_notification_type(row.message)
    return {
        "id": row.id,
        "message": row.message,
        "is_read": row.is_read,
        "notification_type": ntype,
        "created_at": row.created_at,
    }


@router.get("/my", response_model=List[NotificationOut])
def my_notifications(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("/{notif_id}/read")
def mark_read(
    notif_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
