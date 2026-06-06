from typing import Optional
import uuid
from sqlalchemy import String, Text, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database.base_class import Base
from src.models.models import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "project"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    assignee: Mapped[Optional[str]] = mapped_column(String(255))
    team: Mapped[Optional[str]] = mapped_column(Text)          # JSON array stored as text
    start_date: Mapped[Optional[str]] = mapped_column(String(20))
    end_date: Mapped[Optional[str]] = mapped_column(String(20))
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    tags: Mapped[Optional[str]] = mapped_column(Text)          # JSON array stored as text
    client: Mapped[Optional[str]] = mapped_column(String(255))
    category: Mapped[Optional[str]] = mapped_column(String(255))
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant.id"))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"))
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"))

    tenant = relationship("Tenant")
    creator = relationship("User", foreign_keys=[created_by])
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
