from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class HoleStepIn(BaseModel):
    step_no: int = Field(ge=0, le=10)
    size_value: int | None = None
    visual_damage_check: str | None = None
    ream_flag: bool | None = None
    mdr_flag: bool | None = None
    ndi_flag: bool | None = None


class HolePartIn(BaseModel):
    slot_no: int = Field(ge=1, le=4)
    part_number: str | None = None
    part_length: int | None = None
    bushing_type: str | None = None
    standard_custom: str | None = None
    ordered_flag: bool | None = None
    delivered_flag: bool | None = None
    status: str | None = None


class HoleCreate(BaseModel):
    hole_number: int = Field(ge=0)
    max_bp_diameter: int | None = None
    final_hole_size: int | None = None
    fit: str | None = None
    mdr_code: str | None = None
    mdr_version: str | None = None
    ndi_name_initials: str | None = None
    ndi_inspection_date: datetime | None = None
    ndi_finished: bool = False
    inspection_status: str | None = None
    steps: list[HoleStepIn] = []
    parts: list[HolePartIn] = []

    @model_validator(mode="after")
    def validate_ndi(self):
        if self.ndi_finished and (not self.ndi_name_initials or not self.ndi_inspection_date):
            raise ValueError("ndi_name_initials and ndi_inspection_date are required when ndi_finished is true")
        return self


class HoleBatchCreateIn(BaseModel):
    holes: list[HoleCreate] = Field(min_length=1, max_length=500)


class HoleBatchCreateResultRow(BaseModel):
    hole_number: int
    hole_id: int | None = None
    status: str
    detail: str | None = None


class HoleBatchCreateOut(BaseModel):
    created: int
    skipped: int
    errors: int
    results: list[HoleBatchCreateResultRow]


class HoleUpdate(BaseModel):
    max_bp_diameter: int | None = None
    final_hole_size: int | None = None
    fit: str | None = None
    mdr_code: str | None = None
    mdr_version: str | None = None
    ndi_name_initials: str | None = None
    ndi_inspection_date: datetime | None = None
    ndi_finished: bool = False
    inspection_status: str | None = None

    @model_validator(mode="after")
    def validate_ndi(self):
        # Keep updates permissive for legacy imported records.
        # Strict NDI validation is enforced on create flows.
        return self


class HoleStepOut(HoleStepIn):
    id: int

    class Config:
        from_attributes = True


class HolePartOut(HolePartIn):
    id: int

    class Config:
        from_attributes = True


class HoleOut(BaseModel):
    id: int
    panel_id: int
    hole_number: int
    max_bp_diameter: int | None
    final_hole_size: int | None
    fit: str | None
    mdr_code: str | None
    mdr_version: str | None
    ndi_name_initials: str | None
    ndi_inspection_date: datetime | None
    ndi_finished: bool
    inspection_status: str | None
    created_at: datetime
    steps: list[HoleStepOut] = []
    parts: list[HolePartOut] = []

    class Config:
        from_attributes = True


class MdrCaseIn(BaseModel):
    panel_id: int | None = None
    mdr_number: str | None = None
    mdr_version: str | None = None
    subject: str | None = None
    status: str | None = None
    submitted_by: str | None = None
    request_date: datetime | None = None
    need_date: datetime | None = None
    approved: bool = False


class MdrCaseOut(MdrCaseIn):
    id: int

    class Config:
        from_attributes = True


class MdrStatusTransitionIn(BaseModel):
    to_status: str


class MdrRemarkIn(BaseModel):
    remark_index: int = Field(ge=1, le=5)
    remark_text: str
    remark_datetime: datetime | None = None


class MdrRemarkOut(MdrRemarkIn):
    id: int
    mdr_case_id: int

    class Config:
        from_attributes = True


class NdiReportIn(BaseModel):
    panel_id: int | None = None
    hole_id: int | None = None
    name_initials: str | None = None
    inspection_date: datetime | None = None
    method: str | None = None
    tools: str | None = None
    corrosion_position: str | None = None


class NdiReportOut(NdiReportIn):
    id: int

    class Config:
        from_attributes = True


class NdiQueueRowOut(BaseModel):
    hole_id: int
    hole_number: int
    panel_id: int
    panel_number: int
    aircraft_id: int | None
    aircraft_an: str | None
    inspection_status: str | None
    ndi_name_initials: str | None
    ndi_inspection_date: datetime | None
    latest_report_id: int | None
    latest_report_method: str | None
    latest_report_tools: str | None
    queue_status: str


class NdiStatusTransitionIn(BaseModel):
    to_status: str


class InspectionQueueRowOut(BaseModel):
    hole_id: int
    hole_number: int
    panel_id: int
    panel_number: int
    aircraft_id: int | None
    aircraft_an: str | None
    inspection_status: str | None
    queue_status: str


class HoleTrackerRowOut(BaseModel):
    hole_id: int
    hole_number: int
    panel_id: int
    panel_number: int
    aircraft_id: int | None
    aircraft_an: str | None
    max_bp_diameter: int | None
    max_step_size: int | None
    flexhone_needed: bool
    reaming_step_count: int
    queue_status: str


class InstallationTrackerRowOut(BaseModel):
    hole_id: int
    hole_number: int
    panel_id: int
    panel_number: int
    aircraft_id: int | None
    aircraft_an: str | None
    ordered_parts: int
    delivered_parts: int
    pending_parts: int
    installation_ready: bool
    queue_status: str


class MdrRequestDetailOut(BaseModel):
    id: int
    panel_id: int | None
    tve: str | None
    mdr_type: str | None
    serial_number: str | None
    part_number: str | None
    defect_code: str | None
    problem_statement: str | None
    discovered_by: str | None
    date_discovered: datetime | None

    class Config:
        from_attributes = True


class OrderingTrackerRowOut(BaseModel):
    hole_id: int
    hole_number: int
    panel_id: int
    panel_number: int
    aircraft_id: int | None
    aircraft_an: str | None
    inspection_status: str | None
    ordered_parts: int
    delivered_parts: int
    pending_parts: int
    order_needed: bool
    order_in_progress: bool
    delivery_in_progress: bool
    installation_ready: bool


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    username: str
    role: str


class LogoutOut(BaseModel):
    ok: bool
