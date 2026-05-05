"""add rbac tables

Revision ID: add_rbac_tables
Revises: drop_organizationaluser_table
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision = "add_rbac_tables"
down_revision = "drop_organizationaluser_table"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rbacrole",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("role_id", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("color", sa.String(20), nullable=False, server_default="#3b82f6"),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("parent_role", sa.String(100), nullable=True),
        sa.Column("permissions", sa.Text, nullable=True),
        sa.Column("member_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "rbactempaccess",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(100), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("granted_by", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("rbactempaccess")
    op.drop_table("rbacrole")
