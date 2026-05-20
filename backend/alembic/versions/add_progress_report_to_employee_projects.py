"""add progress_report to employee_projects

Revision ID: add_progress_report_to_employee_projects
Revises: make_project_tenant_id_nullable
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from alembic import op

revision = "add_progress_report"
down_revision = "make_project_tenant_id_nullable"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("employee_projects", sa.Column("progress_report", sa.String(2000), nullable=True))


def downgrade():
    op.drop_column("employee_projects", "progress_report")
