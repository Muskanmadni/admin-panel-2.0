"""drop organizationaluser table

Revision ID: drop_organizationaluser_table
Revises: add_project_table
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision = "drop_organizationaluser_table"
down_revision = "add_project_table"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("organizationaluser")


def downgrade():
    op.create_table(
        "organizationaluser",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("user.id"), unique=True, nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenant.id"), nullable=False),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("position", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
