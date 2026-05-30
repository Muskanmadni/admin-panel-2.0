"""add_notification_type

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-22

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL: safe if column already exists
    op.execute(
        """
        ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS notification_type VARCHAR(30) NOT NULL DEFAULT 'general'
        """
    )


def downgrade():
    op.drop_column('notifications', 'notification_type')
