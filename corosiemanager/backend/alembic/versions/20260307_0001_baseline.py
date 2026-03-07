"""baseline schema

Revision ID: 20260307_0001
Revises: 
Create Date: 2026-03-07 22:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "aircraft",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("an", sa.String(length=255), nullable=False),
        sa.Column("serial_number", sa.String(length=255), nullable=True),
        sa.Column("arrival_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_aircraft_id", "aircraft", ["id"])
    op.create_index("ix_aircraft_an", "aircraft", ["an"], unique=True)

    op.create_table(
        "panel",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("aircraft_id", sa.Integer(), sa.ForeignKey("aircraft.id", ondelete="CASCADE"), nullable=True),
        sa.Column("panel_number", sa.Integer(), nullable=False),
        sa.Column("surface", sa.String(length=32), nullable=True),
        sa.Column("start_inspection_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_panel_id", "panel", ["id"])
    op.create_index("ix_panel_aircraft_id", "panel", ["aircraft_id"])
    op.create_index("ix_panel_panel_number", "panel", ["panel_number"])

    op.create_table(
        "hole",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("panel.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hole_number", sa.Integer(), nullable=False),
        sa.Column("max_bp_diameter", sa.Integer(), nullable=True),
        sa.Column("final_hole_size", sa.Integer(), nullable=True),
        sa.Column("fit", sa.String(length=255), nullable=True),
        sa.Column("mdr_code", sa.String(length=255), nullable=True),
        sa.Column("mdr_version", sa.String(length=255), nullable=True),
        sa.Column("ndi_name_initials", sa.String(length=255), nullable=True),
        sa.Column("ndi_inspection_date", sa.DateTime(), nullable=True),
        sa.Column("ndi_finished", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("inspection_status", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("panel_id", "hole_number", name="uq_hole_panel_hole_number"),
    )
    op.create_index("ix_hole_id", "hole", ["id"])
    op.create_index("ix_hole_panel_id", "hole", ["panel_id"])
    op.create_index("ix_hole_mdr_code", "hole", ["mdr_code"])

    op.create_table(
        "hole_step",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hole_id", sa.Integer(), sa.ForeignKey("hole.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_no", sa.Integer(), nullable=False),
        sa.Column("size_value", sa.Integer(), nullable=True),
        sa.Column("visual_damage_check", sa.Text(), nullable=True),
        sa.Column("ream_flag", sa.Boolean(), nullable=True),
        sa.Column("mdr_flag", sa.Boolean(), nullable=True),
        sa.Column("ndi_flag", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("hole_id", "step_no", name="uq_hole_step_no"),
    )
    op.create_index("ix_hole_step_id", "hole_step", ["id"])
    op.create_index("ix_hole_step_hole_id", "hole_step", ["hole_id"])

    op.create_table(
        "hole_part",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hole_id", sa.Integer(), sa.ForeignKey("hole.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_no", sa.Integer(), nullable=False),
        sa.Column("part_number", sa.String(length=255), nullable=True),
        sa.Column("part_length", sa.Integer(), nullable=True),
        sa.Column("bushing_type", sa.String(length=255), nullable=True),
        sa.Column("standard_custom", sa.String(length=255), nullable=True),
        sa.Column("ordered_flag", sa.Boolean(), nullable=True),
        sa.Column("delivered_flag", sa.Boolean(), nullable=True),
        sa.Column("status", sa.String(length=255), nullable=True),
        sa.UniqueConstraint("hole_id", "slot_no", name="uq_hole_part_slot_no"),
    )
    op.create_index("ix_hole_part_id", "hole_part", ["id"])
    op.create_index("ix_hole_part_hole_id", "hole_part", ["hole_id"])

    op.create_table(
        "mdr_case",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("panel.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mdr_number", sa.String(length=255), nullable=True),
        sa.Column("mdr_version", sa.String(length=255), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=255), nullable=True),
        sa.Column("submitted_by", sa.String(length=255), nullable=True),
        sa.Column("request_date", sa.DateTime(), nullable=True),
        sa.Column("need_date", sa.DateTime(), nullable=True),
        sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_mdr_case_id", "mdr_case", ["id"])
    op.create_index("ix_mdr_case_panel_id", "mdr_case", ["panel_id"])
    op.create_index("ix_mdr_case_mdr_number", "mdr_case", ["mdr_number"])

    op.create_table(
        "mdr_remark",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mdr_case_id", sa.Integer(), sa.ForeignKey("mdr_case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remark_index", sa.Integer(), nullable=False),
        sa.Column("remark_text", sa.Text(), nullable=False),
        sa.Column("remark_datetime", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_mdr_remark_id", "mdr_remark", ["id"])
    op.create_index("ix_mdr_remark_mdr_case_id", "mdr_remark", ["mdr_case_id"])

    op.create_table(
        "ndi_report",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("panel.id", ondelete="SET NULL"), nullable=True),
        sa.Column("hole_id", sa.Integer(), sa.ForeignKey("hole.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name_initials", sa.String(length=255), nullable=True),
        sa.Column("inspection_date", sa.DateTime(), nullable=True),
        sa.Column("method", sa.String(length=255), nullable=True),
        sa.Column("tools", sa.Text(), nullable=True),
        sa.Column("corrosion_position", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_ndi_report_id", "ndi_report", ["id"])
    op.create_index("ix_ndi_report_panel_id", "ndi_report", ["panel_id"])
    op.create_index("ix_ndi_report_hole_id", "ndi_report", ["hole_id"])

    op.create_table(
        "mdr_request_detail",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("panel.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tve", sa.String(length=255), nullable=True),
        sa.Column("mdr_type", sa.String(length=255), nullable=True),
        sa.Column("serial_number", sa.String(length=255), nullable=True),
        sa.Column("part_number", sa.String(length=255), nullable=True),
        sa.Column("defect_code", sa.String(length=255), nullable=True),
        sa.Column("problem_statement", sa.Text(), nullable=True),
        sa.Column("discovered_by", sa.String(length=255), nullable=True),
        sa.Column("date_discovered", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_mdr_request_detail_id", "mdr_request_detail", ["id"])
    op.create_index("ix_mdr_request_detail_panel_id", "mdr_request_detail", ["panel_id"])

    op.create_table(
        "app_user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_app_user_id", "app_user", ["id"])
    op.create_index("ix_app_user_username", "app_user", ["username"], unique=True)
    op.create_index("ix_app_user_role", "app_user", ["role"])

    op.create_table(
        "audit_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("entity", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_event_id", "audit_event", ["id"])
    op.create_index("ix_audit_event_action", "audit_event", ["action"])
    op.create_index("ix_audit_event_entity", "audit_event", ["entity"])
    op.create_index("ix_audit_event_username", "audit_event", ["username"])

    op.create_table(
        "auth_session",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_auth_session_id", "auth_session", ["id"])
    op.create_index("ix_auth_session_token_hash", "auth_session", ["token_hash"], unique=True)
    op.create_index("ix_auth_session_username", "auth_session", ["username"])
    op.create_index("ix_auth_session_role", "auth_session", ["role"])
    op.create_index("ix_auth_session_revoked", "auth_session", ["revoked"])


def downgrade() -> None:
    op.drop_index("ix_auth_session_revoked", table_name="auth_session")
    op.drop_index("ix_auth_session_role", table_name="auth_session")
    op.drop_index("ix_auth_session_username", table_name="auth_session")
    op.drop_index("ix_auth_session_token_hash", table_name="auth_session")
    op.drop_index("ix_auth_session_id", table_name="auth_session")
    op.drop_table("auth_session")

    op.drop_index("ix_audit_event_username", table_name="audit_event")
    op.drop_index("ix_audit_event_entity", table_name="audit_event")
    op.drop_index("ix_audit_event_action", table_name="audit_event")
    op.drop_index("ix_audit_event_id", table_name="audit_event")
    op.drop_table("audit_event")

    op.drop_index("ix_app_user_role", table_name="app_user")
    op.drop_index("ix_app_user_username", table_name="app_user")
    op.drop_index("ix_app_user_id", table_name="app_user")
    op.drop_table("app_user")

    op.drop_index("ix_mdr_request_detail_panel_id", table_name="mdr_request_detail")
    op.drop_index("ix_mdr_request_detail_id", table_name="mdr_request_detail")
    op.drop_table("mdr_request_detail")

    op.drop_index("ix_ndi_report_hole_id", table_name="ndi_report")
    op.drop_index("ix_ndi_report_panel_id", table_name="ndi_report")
    op.drop_index("ix_ndi_report_id", table_name="ndi_report")
    op.drop_table("ndi_report")

    op.drop_index("ix_mdr_remark_mdr_case_id", table_name="mdr_remark")
    op.drop_index("ix_mdr_remark_id", table_name="mdr_remark")
    op.drop_table("mdr_remark")

    op.drop_index("ix_mdr_case_mdr_number", table_name="mdr_case")
    op.drop_index("ix_mdr_case_panel_id", table_name="mdr_case")
    op.drop_index("ix_mdr_case_id", table_name="mdr_case")
    op.drop_table("mdr_case")

    op.drop_index("ix_hole_part_hole_id", table_name="hole_part")
    op.drop_index("ix_hole_part_id", table_name="hole_part")
    op.drop_table("hole_part")

    op.drop_index("ix_hole_step_hole_id", table_name="hole_step")
    op.drop_index("ix_hole_step_id", table_name="hole_step")
    op.drop_table("hole_step")

    op.drop_index("ix_hole_mdr_code", table_name="hole")
    op.drop_index("ix_hole_panel_id", table_name="hole")
    op.drop_index("ix_hole_id", table_name="hole")
    op.drop_table("hole")

    op.drop_index("ix_panel_panel_number", table_name="panel")
    op.drop_index("ix_panel_aircraft_id", table_name="panel")
    op.drop_index("ix_panel_id", table_name="panel")
    op.drop_table("panel")

    op.drop_index("ix_aircraft_an", table_name="aircraft")
    op.drop_index("ix_aircraft_id", table_name="aircraft")
    op.drop_table("aircraft")
