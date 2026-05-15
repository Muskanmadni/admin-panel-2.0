"""make project tenant_id nullable

Revision ID: make_project_tenant_id_nullable
Revises: add_face_photo_urls
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from alembic import op

revision = "make_project_tenant_id_nullable"
down_revision = "add_face_photo_urls"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("project", "tenant_id", nullable=True)


def downgrade():
    op.alter_column("project", "tenant_id", nullable=False)
