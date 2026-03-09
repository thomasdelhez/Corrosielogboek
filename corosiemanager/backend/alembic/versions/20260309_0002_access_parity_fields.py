"""add access parity fields for hole/mdr/mdr request detail

Revision ID: 20260309_0002
Revises: 20260307_0001
Create Date: 2026-03-09 13:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260309_0002"
down_revision = "20260307_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # hole
    op.add_column("hole", sa.Column("mdr_resubmit", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("total_stackup_length", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("stack_up", sa.Integer(), nullable=True))
    op.add_column("hole", sa.Column("sleeve_bushings", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("countersinked", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("clean", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("cut_sleeve_bushing", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("installed", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("primer", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("surface_corrosion", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("hole", sa.Column("nutplate_inspection", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("nutplate_surface_corrosion", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("total_structure_thickness", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("flexhone", sa.String(length=255), nullable=True))
    op.add_column("hole", sa.Column("flexndi", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # mdr_case
    op.add_column("mdr_case", sa.Column("aircraft_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_mdr_case_aircraft_id_aircraft",
        "mdr_case",
        "aircraft",
        ["aircraft_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_mdr_case_aircraft_id", "mdr_case", ["aircraft_id"])

    op.add_column("mdr_case", sa.Column("aircraft_an", sa.String(length=255), nullable=True))
    op.add_column("mdr_case", sa.Column("aircraft_serial_number", sa.String(length=255), nullable=True))
    op.add_column("mdr_case", sa.Column("aircraft_arrival_date", sa.DateTime(), nullable=True))
    op.add_column("mdr_case", sa.Column("panel_number", sa.Integer(), nullable=True))
    op.add_column("mdr_case", sa.Column("hole_ids", sa.String(length=255), nullable=True))
    op.add_column("mdr_case", sa.Column("resubmit", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("mdr_case", sa.Column("request_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("mdr_case", sa.Column("ed_number", sa.String(length=255), nullable=True))
    op.add_column("mdr_case", sa.Column("dcm_check", sa.String(length=255), nullable=True))
    op.add_column("mdr_case", sa.Column("submit_list_date", sa.DateTime(), nullable=True))
    op.add_column("mdr_case", sa.Column("approval_date", sa.DateTime(), nullable=True))
    op.add_column("mdr_case", sa.Column("tier2", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # mdr_request_detail
    op.add_column("mdr_request_detail", sa.Column("panel_number", sa.Integer(), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("task_type", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("fms_or_non_fms", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("releasability", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("technical_product_number", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("technical_product_title", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("submitter_name", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("internal_reference_number", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("cr_ecp", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("discrepancy_type", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("cause_code_discrepant_work", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("resubmit_reason", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("access_location", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("date_due_to_field", sa.DateTime(), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("lcn", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("lcn_description", sa.Text(), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("inspection_criteria", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("mgi_required", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("mgi_number", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("discovered_during", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("when_discovered", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("technical_product_details_summary", sa.Text(), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("tms", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("mdr_request_detail", sa.Column("confirm_email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("mdr_request_detail", "confirm_email")
    op.drop_column("mdr_request_detail", "email")
    op.drop_column("mdr_request_detail", "tms")
    op.drop_column("mdr_request_detail", "technical_product_details_summary")
    op.drop_column("mdr_request_detail", "when_discovered")
    op.drop_column("mdr_request_detail", "discovered_during")
    op.drop_column("mdr_request_detail", "mgi_number")
    op.drop_column("mdr_request_detail", "mgi_required")
    op.drop_column("mdr_request_detail", "inspection_criteria")
    op.drop_column("mdr_request_detail", "lcn_description")
    op.drop_column("mdr_request_detail", "lcn")
    op.drop_column("mdr_request_detail", "date_due_to_field")
    op.drop_column("mdr_request_detail", "access_location")
    op.drop_column("mdr_request_detail", "resubmit_reason")
    op.drop_column("mdr_request_detail", "cause_code_discrepant_work")
    op.drop_column("mdr_request_detail", "discrepancy_type")
    op.drop_column("mdr_request_detail", "cr_ecp")
    op.drop_column("mdr_request_detail", "internal_reference_number")
    op.drop_column("mdr_request_detail", "location")
    op.drop_column("mdr_request_detail", "submitter_name")
    op.drop_column("mdr_request_detail", "technical_product_title")
    op.drop_column("mdr_request_detail", "technical_product_number")
    op.drop_column("mdr_request_detail", "releasability")
    op.drop_column("mdr_request_detail", "fms_or_non_fms")
    op.drop_column("mdr_request_detail", "task_type")
    op.drop_column("mdr_request_detail", "panel_number")

    op.drop_column("mdr_case", "tier2")
    op.drop_column("mdr_case", "approval_date")
    op.drop_column("mdr_case", "submit_list_date")
    op.drop_column("mdr_case", "dcm_check")
    op.drop_column("mdr_case", "ed_number")
    op.drop_column("mdr_case", "request_sent")
    op.drop_column("mdr_case", "resubmit")
    op.drop_column("mdr_case", "hole_ids")
    op.drop_column("mdr_case", "panel_number")
    op.drop_column("mdr_case", "aircraft_arrival_date")
    op.drop_column("mdr_case", "aircraft_serial_number")
    op.drop_column("mdr_case", "aircraft_an")
    op.drop_index("ix_mdr_case_aircraft_id", table_name="mdr_case")
    op.drop_constraint("fk_mdr_case_aircraft_id_aircraft", "mdr_case", type_="foreignkey")
    op.drop_column("mdr_case", "aircraft_id")

    op.drop_column("hole", "flexndi")
    op.drop_column("hole", "flexhone")
    op.drop_column("hole", "total_structure_thickness")
    op.drop_column("hole", "nutplate_surface_corrosion")
    op.drop_column("hole", "nutplate_inspection")
    op.drop_column("hole", "surface_corrosion")
    op.drop_column("hole", "primer")
    op.drop_column("hole", "installed")
    op.drop_column("hole", "cut_sleeve_bushing")
    op.drop_column("hole", "clean")
    op.drop_column("hole", "countersinked")
    op.drop_column("hole", "sleeve_bushings")
    op.drop_column("hole", "stack_up")
    op.drop_column("hole", "total_stackup_length")
    op.drop_column("hole", "mdr_resubmit")
