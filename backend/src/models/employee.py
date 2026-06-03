# Employee profile table
# Stores department and role separately from the main User table
import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base_class import Base
from .models import TimestampMixin

class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), unique=True, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(255))
    role: Mapped[Optional[str]] = mapped_column(String(255))
    face_photo_urls: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    user = relationship("User", backref="employee_profile")


class EmployeeProject(Base, TimestampMixin):
    __tablename__ = "employee_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    assigned_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="assigned")
    progress_report: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    employee = relationship("User", foreign_keys=[employee_id])
    project = relationship("Project", foreign_keys=[project_id])
    assigner = relationship("User", foreign_keys=[assigned_by])


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[str] = mapped_column(String(20), nullable=False)
    end_date: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    days: Mapped[int] = mapped_column(nullable=False, default=1)

    employee = relationship("User", foreign_keys=[employee_id])


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user = relationship("User", foreign_keys=[user_id])


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=False)        # YYYY-MM-DD
    check_in: Mapped[Optional[str]] = mapped_column(String(10))          # HH:MM
    check_out: Mapped[Optional[str]] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="present")
    hours: Mapped[float] = mapped_column(nullable=False, default=0.0)

    employee = relationship("User", foreign_keys=[employee_id])



class TimeLog(Base, TimestampMixin):
    __tablename__ = "time_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    project: Mapped[str] = mapped_column(String(255), nullable=False)
    task: Mapped[str] = mapped_column(String(500), nullable=False)
    tag: Mapped[Optional[str]] = mapped_column(String(100))
    start_time: Mapped[str] = mapped_column(String(30), nullable=False)   # ISO string
    end_time: Mapped[str] = mapped_column(String(30), nullable=False)
    duration: Mapped[int] = mapped_column(nullable=False)                  # seconds

    employee = relationship("User", foreign_keys=[employee_id])


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    expires_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    author = relationship("User", foreign_keys=[created_by])
