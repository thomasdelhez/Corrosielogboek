"""add lookup tables for mdr dropdown parity

Revision ID: 20260309_0003
Revises: 20260309_0002
Create Date: 2026-03-09 14:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260309_0003"
down_revision = "20260309_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lookup_status_code",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status_code", sa.String(length=255), nullable=True),
        sa.Column("status_code_dcm", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_lookup_status_code_id", "lookup_status_code", ["id"])

    op.create_table(
        "lookup_mdr_option",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lcn", sa.String(length=255), nullable=True),
        sa.Column("discrepancy_type", sa.String(length=255), nullable=True),
        sa.Column("cause_code_discrepant_work", sa.String(length=255), nullable=True),
        sa.Column("when_discovered", sa.String(length=255), nullable=True),
        sa.Column("discovered_by", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_lookup_mdr_option_id", "lookup_mdr_option", ["id"])


def downgrade() -> None:
    op.drop_index("ix_lookup_mdr_option_id", table_name="lookup_mdr_option")
    op.drop_table("lookup_mdr_option")

    op.drop_index("ix_lookup_status_code_id", table_name="lookup_status_code")
    op.drop_table("lookup_status_code")
