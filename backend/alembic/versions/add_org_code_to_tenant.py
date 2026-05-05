"""add org_code to tenant

Revision ID: add_org_code_to_tenant
Revises: add_employee_table
Branch_labels: None
depends_on: None
"""
from alembic import op
import sqlalchemy as sa

revision = "add_org_code_to_tenant"
down_revision = "add_employee_table"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("tenant", sa.Column("org_code", sa.String(10), nullable=True))
    op.create_unique_constraint("uq_tenant_org_code", "tenant", ["org_code"])

def downgrade():
    op.drop_constraint("uq_tenant_org_code", "tenant", type_="unique")
    op.drop_column("tenant", "org_code")
