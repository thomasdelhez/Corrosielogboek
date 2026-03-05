from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


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

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

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
    panel_id: Mapped[int | None] = mapped_column(ForeignKey("panel.id", ondelete="SET NULL"), nullable=True, index=True)
    mdr_number: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    mdr_version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    request_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    need_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)


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
    mdr_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    part_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    defect_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovered_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_discovered: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
