from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Aircraft(Base):
    __tablename__ = "aircraft"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    an: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    arrival_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Panel(Base):
    __tablename__ = "panel"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aircraft_id: Mapped[int | None] = mapped_column(ForeignKey("aircraft.id", ondelete="CASCADE"), nullable=True, index=True)
    panel_number: Mapped[int] = mapped_column(Integer, index=True)
    surface: Mapped[str | None] = mapped_column(String(32), nullable=True)
    start_inspection_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Hole(Base):
    __tablename__ = "hole"
    __table_args__ = (UniqueConstraint("panel_id", "hole_number", name="uq_hole_panel_hole_number"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    panel_id: Mapped[int] = mapped_column(ForeignKey("panel.id", ondelete="CASCADE"), index=True)
    hole_number: Mapped[int] = mapped_column(Integer)

    max_bp_diameter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_hole_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mdr_code: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    mdr_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ndi_name_initials: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ndi_inspection_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ndi_finished: Mapped[bool] = mapped_column(Boolean, default=False)
    inspection_status: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mdr_resubmit: Mapped[bool] = mapped_column(Boolean, default=False)
    total_stackup_length: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stack_up: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleeve_bushings: Mapped[str | None] = mapped_column(String(255), nullable=True)
    countersinked: Mapped[bool] = mapped_column(Boolean, default=False)
    clean: Mapped[bool] = mapped_column(Boolean, default=False)
    cut_sleeve_bushing: Mapped[bool] = mapped_column(Boolean, default=False)
    installed: Mapped[bool] = mapped_column(Boolean, default=False)
    primer: Mapped[bool] = mapped_column(Boolean, default=False)
    surface_corrosion: Mapped[bool] = mapped_column(Boolean, default=False)
    nutplate_inspection: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nutplate_surface_corrosion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_structure_thickness: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flexhone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flexndi: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    steps: Mapped[list["HoleStep"]] = relationship(back_populates="hole", cascade="all, delete-orphan")
    parts: Mapped[list["HolePart"]] = relationship(back_populates="hole", cascade="all, delete-orphan")


class HoleStep(Base):
    __tablename__ = "hole_step"
    __table_args__ = (UniqueConstraint("hole_id", "step_no", name="uq_hole_step_no"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    hole_id: Mapped[int] = mapped_column(ForeignKey("hole.id", ondelete="CASCADE"), index=True)
    step_no: Mapped[int] = mapped_column(Integer)
    size_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visual_damage_check: Mapped[str | None] = mapped_column(Text, nullable=True)
    ream_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mdr_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ndi_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    hole: Mapped[Hole] = relationship(back_populates="steps")


class HolePart(Base):
    __tablename__ = "hole_part"
    __table_args__ = (UniqueConstraint("hole_id", "slot_no", name="uq_hole_part_slot_no"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    hole_id: Mapped[int] = mapped_column(ForeignKey("hole.id", ondelete="CASCADE"), index=True)
    slot_no: Mapped[int] = mapped_column(Integer)
    part_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    part_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bushing_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    standard_custom: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ordered_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    delivered_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    status: Mapped[str | None] = mapped_column(String(255), nullable=True)

    hole: Mapped[Hole] = relationship(back_populates="parts")


class MdrCase(Base):
    __tablename__ = "mdr_case"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aircraft_id: Mapped[int | None] = mapped_column(ForeignKey("aircraft.id", ondelete="SET NULL"), nullable=True, index=True)
    aircraft_an: Mapped[str | None] = mapped_column(String(255), nullable=True)
    aircraft_serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    aircraft_arrival_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    panel_id: Mapped[int | None] = mapped_column(ForeignKey("panel.id", ondelete="SET NULL"), nullable=True, index=True)
    panel_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hole_ids: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resubmit: Mapped[bool] = mapped_column(Boolean, default=False)
    request_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    mdr_number: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    mdr_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ed_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dcm_check: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submit_list_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    request_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    need_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approval_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    tier2: Mapped[bool] = mapped_column(Boolean, default=False)


class MdrRemark(Base):
    __tablename__ = "mdr_remark"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    mdr_case_id: Mapped[int] = mapped_column(ForeignKey("mdr_case.id", ondelete="CASCADE"), index=True)
    remark_index: Mapped[int] = mapped_column(Integer)
    remark_text: Mapped[str] = mapped_column(Text)
    remark_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class NdiReport(Base):
    __tablename__ = "ndi_report"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    panel_id: Mapped[int | None] = mapped_column(ForeignKey("panel.id", ondelete="SET NULL"), nullable=True, index=True)
    hole_id: Mapped[int | None] = mapped_column(ForeignKey("hole.id", ondelete="SET NULL"), nullable=True, index=True)
    name_initials: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inspection_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tools: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrosion_position: Mapped[str | None] = mapped_column(String(255), nullable=True)


class MdrRequestDetail(Base):
    __tablename__ = "mdr_request_detail"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    panel_id: Mapped[int | None] = mapped_column(ForeignKey("panel.id", ondelete="SET NULL"), nullable=True, index=True)
    tve: Mapped[str | None] = mapped_column(String(255), nullable=True)
    panel_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    task_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fms_or_non_fms: Mapped[str | None] = mapped_column(String(255), nullable=True)
    releasability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technical_product_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technical_product_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mdr_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    part_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    internal_reference_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cr_ecp: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discrepancy_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cause_code_discrepant_work: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resubmit_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    defect_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    access_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_due_to_field: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lcn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lcn_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    inspection_criteria: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mgi_required: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mgi_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discovered_during: Mapped[str | None] = mapped_column(String(255), nullable=True)
    when_discovered: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_product_details_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tms: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confirm_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discovered_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_discovered: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class LookupStatusCode(Base):
    __tablename__ = "lookup_status_code"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    status_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_code_dcm: Mapped[str | None] = mapped_column(String(255), nullable=True)


class LookupMdrOption(Base):
    __tablename__ = "lookup_mdr_option"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lcn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discrepancy_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cause_code_discrepant_work: Mapped[str | None] = mapped_column(String(255), nullable=True)
    when_discovered: Mapped[str | None] = mapped_column(String(255), nullable=True)
    discovered_by: Mapped[str | None] = mapped_column(String(255), nullable=True)


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255), default="demo")
    role: Mapped[str] = mapped_column(String(64), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditEvent(Base):
    __tablename__ = "audit_event"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    entity: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    username: Mapped[str] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuthSession(Base):
    __tablename__ = "auth_session"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(64), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
