"""add phone to users, email optional

Revision ID: 20260707_0003
Revises: 20260620_0002
Create Date: 2026-07-07
"""
from alembic import op
import sqlalchemy as sa

revision = "20260707_0003"
down_revision = "20260620_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(length=32), nullable=True))
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=True)
    op.alter_column('users', 'email', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'email', existing_type=sa.String(length=255), nullable=False)
    op.drop_index(op.f('ix_users_phone'), table_name='users')
    op.drop_column('users', 'phone')