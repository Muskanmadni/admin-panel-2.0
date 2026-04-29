import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column, declared_attr
from sqlalchemy.sql import func

from src.database.base_class import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TenantMixin:
    @declared_attr
    def tenant_id(cls) -> Mapped[uuid.UUID]:
        return mapped_column(UUID(as_uuid=True), ForeignKey("tenant.id"), index=True, nullable=False)

class Tenant(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="tenant")

    # Relationships
    organizational_users = relationship("OrganizationalUser", back_populates="tenant")
    projects = relationship("Project", back_populates="tenant")


class User(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supabase_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    user_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'organizational' or 'individual'
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="employee")  # admin, manager, employee, client
    fcm_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    projects = relationship("Project", back_populates="owner")
    time_entries = relationship("TimeEntry", back_populates="user")
    leave_requests = relationship("LeaveRequest", back_populates="user")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="[Message.recipient_id]", back_populates="recipient")

    __table_args__ = (
        Index("ix_user_email", "email", unique=True),
    )


class OrganizationalUser(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), unique=True, nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant.id"), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(255))
    position: Mapped[Optional[str]] = mapped_column(String(255))

    # Relationships
    user = relationship("User", backref="organizational_profile")
    tenant = relationship("Tenant", back_populates="organizational_users")


class IndividualUser(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), unique=True, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", backref="individual_profile")


class Project(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="projects")
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="project", cascade="all, delete-orphan")


class Task(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), index=True, nullable=False)
    assigned_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="todo")
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    project = relationship("Project", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task")


class TimeEntry(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("task.id"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), index=True, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration: Mapped[Optional[int]] = mapped_column(Integer)  # in seconds

    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")
    screenshots = relationship("Screenshot", back_populates="time_entry")


class Screenshot(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    time_entry_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("timeentry.id"), index=True, nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)

    # Relationships
    time_entry = relationship("TimeEntry", back_populates="screenshots")


class Invoice(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    payments = relationship("Payment", back_populates="invoice")

    __table_args__ = (
        Index("ix_invoice_tenant_number", "tenant_id", "number", unique=True),
    )


class Payment(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoice.id"), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="completed")

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")


class Notification(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class Message(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    recipient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), index=True, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    project = relationship("Project", back_populates="messages")


class File(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    size: Mapped[int] = mapped_column(Integer)  # in bytes


class LeaveRequest(Base, TimestampMixin, TenantMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), index=True, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # Relationships
    user = relationship("User", back_populates="leave_requests")


class RBACRole(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    permissions: Mapped[Optional[str]] = mapped_column(Text)  # JSON array stored as text
    member_count: Mapped[int] = mapped_column(Integer, default=0)


class RBACTempAccess(Base, TimestampMixin):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    granted_by: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
