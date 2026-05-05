"""rename user table to app_user to avoid schema conflicts

Revision ID: rename_user_to_app_user
Revises: add_org_code_to_tenant
Branch_labels: None
depends_on: None
"""
from alembic import op

revision = "rename_user_to_app_user"
down_revision = "add_org_code_to_tenant"
branch_labels = None
depends_on = None

def upgrade():
    # Rename the table
    op.rename_table("user", "app_user")
    # Update foreign keys that reference "user"
    op.execute('ALTER TABLE organizationaluser DROP CONSTRAINT IF EXISTS organizationaluser_user_id_fkey')
    op.execute('ALTER TABLE organizationaluser ADD CONSTRAINT organizationaluser_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id)')
    op.execute('ALTER TABLE individualuser DROP CONSTRAINT IF EXISTS individualuser_user_id_fkey')
    op.execute('ALTER TABLE individualuser ADD CONSTRAINT individualuser_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id)')
    op.execute('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey')
    op.execute('ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id)')
    op.execute('ALTER TABLE tenant DROP CONSTRAINT IF EXISTS tenant_user_id_fkey')

def downgrade():
    op.rename_table("app_user", "user")
