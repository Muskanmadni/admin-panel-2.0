"""add_time_logs_table

Revision ID: 7b65cd37a81f
Revises: add_progress_report
Create Date: 2026-05-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '7b65cd37a81f'
down_revision = 'add_progress_report'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'time_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('project', sa.String(255), nullable=False),
        sa.Column('task', sa.String(500), nullable=False),
        sa.Column('tag', sa.String(100), nullable=True),
        sa.Column('start_time', sa.String(30), nullable=False),
        sa.Column('end_time', sa.String(30), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('time_logs')
