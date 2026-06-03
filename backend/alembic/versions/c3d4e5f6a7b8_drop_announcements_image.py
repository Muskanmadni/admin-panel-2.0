"""drop_announcements_image

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-03

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'announcements' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('announcements')}
    if 'image' in columns:
        op.drop_column('announcements', 'image')


def downgrade():
    op.add_column('announcements', sa.Column('image', sa.Text(), nullable=True))
