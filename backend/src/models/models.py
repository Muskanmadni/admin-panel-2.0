# Employee profile table
# Storing department and role separately from User for potential future expansion

from typing import Optional

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base_class import Base

from sqlalchemy import Column, DateTime

from sqlalchemy.sql import func

class TimestampMixin:

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class User(Base, TimestampMixin):

    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    supabase_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), unique=True)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    full_name: Mapped[Optional[str]] = mapped_column(String(255))

    user_type: Mapped[str] = mapped_column(String(50), nullable=False)

    role: Mapped[str] = mapped_column(String(50), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant.id"))

    # Relationships

    tenant = relationship("Tenant", backref="users")

class Tenant(Base, TimestampMixin):

    __tablename__ = "tenant"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    org_code: Mapped[Optional[str]] = mapped_column(String(10), unique=True, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class IndividualUser(Base, TimestampMixin):

    __tablename__ = "individualuser"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), unique=True, nullable=False)

    phone_number: Mapped[Optional[str]] = mapped_column(String(255))

    address: Mapped[Optional[str]] = mapped_column(String(255))

    user = relationship("User", backref="individual_profile")




class RBACRole(Base, TimestampMixin):

    __tablename__ = "rbacrole"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    role_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[Optional[str]] = mapped_column(String(500))

    color: Mapped[str] = mapped_column(String(20), default="#3b82f6")

    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    parent_role: Mapped[Optional[str]] = mapped_column(String(100))

    permissions: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # JSON string

    member_count: Mapped[int] = mapped_column(default=0)


class RBACTempAccess(Base, TimestampMixin):

    __tablename__ = "rbactempaccess"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(100), nullable=False)

    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    granted_by: Mapped[Optional[str]] = mapped_column(String(255))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
