"""add status to employee_projects

Revision ID: add_status_to_employee_projects
Revises: add_employee_projects
Branch_labels: None
depends_on: None
"""
import sqlalchemy as sa
from alembic import op

revision = "add_status_to_employee_projects"
down_revision = "add_employee_projects"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "employee_projects",
        sa.Column("status", sa.String(50), nullable=False, server_default="assigned"),
    )


def downgrade():
    op.drop_column("employee_projects", "status")
