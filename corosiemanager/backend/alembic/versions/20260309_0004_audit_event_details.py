"""add details column to audit_event

Revision ID: 20260309_0004
Revises: 20260309_0003
Create Date: 2026-03-09 19:35:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260309_0004"
down_revision = "20260309_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_event", sa.Column("details", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_event", "details")
