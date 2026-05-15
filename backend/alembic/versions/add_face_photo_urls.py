"""add face_photo_urls to employees

Revision ID: add_face_photo_urls
Revises: add_status_to_employee_projects
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "add_face_photo_urls"
down_revision = "add_status_to_employee_projects"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("employees", sa.Column("face_photo_urls", JSONB, nullable=True))


def downgrade():
    op.drop_column("employees", "face_photo_urls")
