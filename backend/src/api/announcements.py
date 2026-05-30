from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field

from src.api import deps
from src.models import User
from src.models.employee import Announcement

router = APIRouter()

ADMIN_ROLES = ("admin", "super_admin", "manager")
VALID_PRIORITIES = ("low", "medium", "high")
VALID_STATUSES = ("draft", "published", "archived")


class AnnouncementIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=1000)
    content: str = ""
    priority: str = "medium"
    status: str = "draft"
    image: Optional[str] = None
    expires_at: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: UUID
    title: str
    description: str
    content: str
    priority: str
    status: str
    image: Optional[str]
    expires_at: Optional[str]
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    created_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")


def _validate_priority(priority: str) -> None:
    if priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority. Use: {', '.join(VALID_PRIORITIES)}")


def _validate_status(status: str) -> None:
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {', '.join(VALID_STATUSES)}")


def _to_out(row: Announcement, author: User | None = None) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "content": row.content or "",
        "priority": row.priority,
        "status": row.status,
        "image": row.image,
        "expires_at": row.expires_at,
        "created_by": row.created_by,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "created_by_name": author.full_name if author else None,
    }


@router.get("/", response_model=List[AnnouncementOut])
def list_announcements(
    status: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(Announcement)
    if current_user.role in ADMIN_ROLES:
        if status:
            _validate_status(status)
            query = query.filter(Announcement.status == status)
    else:
        query = query.filter(Announcement.status == "published")

    rows = query.order_by(Announcement.created_at.desc()).limit(200).all()
    result = []
    for row in rows:
        author = db.query(User).filter(User.id == row.created_by).first()
        result.append(_to_out(row, author))
    return result


@router.post("/", response_model=AnnouncementOut)
def create_announcement(
    data: AnnouncementIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    _validate_priority(data.priority)
    _validate_status(data.status)

    row = Announcement(
        title=data.title.strip(),
        description=data.description.strip(),
        content=data.content or "",
        priority=data.priority,
        status=data.status,
        image=data.image,
        expires_at=data.expires_at,
        created_by=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row, current_user)


@router.put("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: UUID,
    data: AnnouncementIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    _validate_priority(data.priority)
    _validate_status(data.status)

    row = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")

    row.title = data.title.strip()
    row.description = data.description.strip()
    row.content = data.content or ""
    row.priority = data.priority
    row.status = data.status
    row.image = data.image
    row.expires_at = data.expires_at
    db.commit()
    db.refresh(row)
    author = db.query(User).filter(User.id == row.created_by).first()
    return _to_out(row, author)


@router.patch("/{announcement_id}/publish", response_model=AnnouncementOut)
def publish_announcement(
    announcement_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    row = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")

    row.status = "published"
    db.commit()
    db.refresh(row)
    author = db.query(User).filter(User.id == row.created_by).first()
    return _to_out(row, author)


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    row = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
