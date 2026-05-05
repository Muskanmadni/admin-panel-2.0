"""rename app_user table back to user

Revision ID: rename_app_user_to_user
Revises: rename_user_to_app_user
Branch_labels: None
depends_on: None
"""
from alembic import op

revision = "rename_app_user_to_user"
down_revision = "rename_user_to_app_user"
branch_labels = None
depends_on = None


def upgrade():
    op.rename_table("app_user", "user")
    op.execute('ALTER TABLE organizational_user DROP CONSTRAINT IF EXISTS organizationaluser_user_id_fkey')
    op.execute('ALTER TABLE organizational_user ADD CONSTRAINT organizationaluser_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id)')
    op.execute('ALTER TABLE individual_user DROP CONSTRAINT IF EXISTS individualuser_user_id_fkey')
    op.execute('ALTER TABLE individual_user ADD CONSTRAINT individualuser_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id)')
    op.execute('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey')
    op.execute('ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id)')
    op.execute('ALTER TABLE tenant DROP CONSTRAINT IF EXISTS tenant_user_id_fkey')


def downgrade():
    op.rename_table("user", "app_user")
