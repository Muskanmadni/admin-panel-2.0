"""add employee_projects table

Revision ID: add_employee_projects
Revises: add_rbac_tables
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision = "add_employee_projects"
down_revision = "add_rbac_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "employee_projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("employee_id", UUID(as_uuid=True), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("project.id"), nullable=False),
        sa.Column("assigned_by", UUID(as_uuid=True), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("employee_projects")
