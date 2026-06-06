"""move_tasks_to_project_level

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'project_tasks' not in tables:
        op.create_table(
            'project_tasks',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('project.id'), nullable=False),
            sa.Column('title', sa.String(500), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if 'assignment_tasks' in tables:
        op.execute("""
            INSERT INTO project_tasks (id, project_id, title, description, is_completed, sort_order, created_at, updated_at)
            SELECT at.id, ep.project_id, at.title, at.description, at.is_completed, at.sort_order, at.created_at, at.updated_at
            FROM assignment_tasks at
            JOIN employee_projects ep ON ep.id = at.assignment_id
            ON CONFLICT (id) DO NOTHING
        """)
        op.drop_table('assignment_tasks')


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'assignment_tasks' not in inspector.get_table_names():
        op.create_table(
            'assignment_tasks',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('assignment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employee_projects.id'), nullable=False),
            sa.Column('title', sa.String(500), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if 'project_tasks' in inspector.get_table_names():
        op.drop_table('project_tasks')
