"""add user warehouse

Revision ID: 20260620_0002
Revises: 20260618_0001
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "20260620_0002"
down_revision = "20260618_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('warehouse', sa.Enum('ASTANA', 'ALMATY', name='warehousecode', create_type=False), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'warehouse')
