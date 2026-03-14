"""add repair workflow fields to hole

Revision ID: 20260314_0006
Revises: 20260310_0005
Create Date: 2026-03-14 12:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0006"
down_revision = "20260310_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hole", sa.Column("bp_damage_clean", sa.String(length=32), nullable=True))
    op.add_column("hole", sa.Column("ream_max_bp", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("mdr_needed", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("nutplate_test", sa.String(length=32), nullable=True))
    op.add_column("hole", sa.Column("example_part", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("clean_alcohol_alodine", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.alter_column("hole", "ream_max_bp", server_default=None)
    op.alter_column("hole", "mdr_needed", server_default=None)
    op.alter_column("hole", "clean_alcohol_alodine", server_default=None)


def downgrade() -> None:
    op.drop_column("hole", "clean_alcohol_alodine")
    op.drop_column("hole", "example_part")
    op.drop_column("hole", "nutplate_test")
    op.drop_column("hole", "mdr_needed")
    op.drop_column("hole", "ream_max_bp")
    op.drop_column("hole", "bp_damage_clean")
