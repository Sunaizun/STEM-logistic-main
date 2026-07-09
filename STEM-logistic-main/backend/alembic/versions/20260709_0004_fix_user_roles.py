"""fix user roles enum: remove AUDITOR/VIEWER, add PN

Revision ID: 20260709_0004
Revises: 20260707_0003
Create Date: 2026-07-09
"""
from alembic import op
import sqlalchemy as sa

revision = "20260709_0004"
down_revision = "20260707_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Создаём новый enum-тип с правильным набором значений
    op.execute("CREATE TYPE userrole_new AS ENUM ('ADMIN', 'MANAGER', 'WAREHOUSE', 'PN')")

    # Переключаем колонку на новый тип.
    # На всякий случай: если вдруг у кого-то была роль AUDITOR/VIEWER,
    # она будет переведена в WAREHOUSE как безопасное значение по умолчанию.
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN role TYPE userrole_new
        USING (
            CASE role::text
                WHEN 'AUDITOR' THEN 'WAREHOUSE'
                WHEN 'VIEWER' THEN 'WAREHOUSE'
                ELSE role::text
            END
        )::userrole_new
    """)

    # Удаляем старый тип, переименовываем новый на его место
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_new RENAME TO userrole")


def downgrade() -> None:
    op.execute("CREATE TYPE userrole_old AS ENUM ('ADMIN', 'MANAGER', 'WAREHOUSE', 'AUDITOR', 'VIEWER')")
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN role TYPE userrole_old
        USING (
            CASE role::text
                WHEN 'PN' THEN 'VIEWER'
                ELSE role::text
            END
        )::userrole_old
    """)
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_old RENAME TO userrole")