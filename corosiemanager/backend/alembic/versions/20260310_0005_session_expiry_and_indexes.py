"""add auth session expiry and query indexes

Revision ID: 20260310_0005
Revises: 20260309_0004
Create Date: 2026-03-10 11:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260310_0005"
down_revision = "20260309_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "auth_session",
        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP + INTERVAL '12 hours'"),
        ),
    )
    op.create_index("ix_auth_session_expires_at", "auth_session", ["expires_at"])

    op.create_index("ix_hole_inspection_status", "hole", ["inspection_status"])
    op.create_index("ix_mdr_case_status", "mdr_case", ["status"])
    op.create_index("ix_audit_event_created_at", "audit_event", ["created_at"])
    op.create_index("ix_ndi_report_hole_id_id", "ndi_report", ["hole_id", "id"])

    op.alter_column("auth_session", "expires_at", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_ndi_report_hole_id_id", table_name="ndi_report")
    op.drop_index("ix_audit_event_created_at", table_name="audit_event")
    op.drop_index("ix_mdr_case_status", table_name="mdr_case")
    op.drop_index("ix_hole_inspection_status", table_name="hole")
    op.drop_index("ix_auth_session_expires_at", table_name="auth_session")
    op.drop_column("auth_session", "expires_at")
