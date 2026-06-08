"""add_signup_policies_table

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'g7h8i9j0k1l2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'signup_policies' in inspector.get_table_names():
        return

    op.create_table(
        'signup_policies',
        sa.Column('id', sa.String(20), primary_key=True),
        sa.Column('label', sa.String(120), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('storage_path', sa.String(255), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.execute(
        """
        INSERT INTO signup_policies (id, label, title, storage_path, file_name, file_url)
        VALUES
        (
            'terms',
            'Terms & Conditions',
            'Remote Internship Compensation & Work Policy',
            'terms.pdf',
            'compensation-work-policy.pdf',
            '/policies/compensation-work-policy.pdf'
        ),
        (
            'policies',
            'Office Policies',
            'Updated Office Policies 2025',
            'office-policies.pdf',
            'office-policies-2025.pdf',
            '/policies/office-policies-2025.pdf'
        )
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade():
    op.drop_table('signup_policies')
