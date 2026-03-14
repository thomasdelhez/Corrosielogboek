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
    bp_damage_clean: str | None = None
    final_hole_size: int | None = None
    fit: str | None = None
    ream_max_bp: bool = False
    mdr_code: str | None = None
    mdr_needed: bool = False
    mdr_version: str | None = None
    ndi_name_initials: str | None = None
    ndi_inspection_date: datetime | None = None
    ndi_finished: bool = False
    inspection_status: str | None = None
    mdr_resubmit: bool = False
    total_stackup_length: str | None = None
    stack_up: int | None = None
    sleeve_bushings: str | None = None
    countersinked: bool = False
    clean: bool = False
    cut_sleeve_bushing: bool = False
    installed: bool = False
    primer: bool = False
    surface_corrosion: bool = False
    nutplate_inspection: str | None = None
    nutplate_surface_corrosion: str | None = None
    nutplate_test: str | None = None
    total_structure_thickness: str | None = None
    flexhone: str | None = None
    flexndi: bool = False
    example_part: str | None = None
    clean_alcohol_alodine: bool = False
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
    bp_damage_clean: str | None = None
    final_hole_size: int | None = None
    fit: str | None = None
    ream_max_bp: bool = False
    mdr_code: str | None = None
    mdr_needed: bool = False
    mdr_version: str | None = None
    ndi_name_initials: str | None = None
    ndi_inspection_date: datetime | None = None
    ndi_finished: bool = False
    inspection_status: str | None = None
    mdr_resubmit: bool = False
    total_stackup_length: str | None = None
    stack_up: int | None = None
    sleeve_bushings: str | None = None
    countersinked: bool = False
    clean: bool = False
    cut_sleeve_bushing: bool = False
    installed: bool = False
    primer: bool = False
    surface_corrosion: bool = False
    nutplate_inspection: str | None = None
    nutplate_surface_corrosion: str | None = None
    nutplate_test: str | None = None
    total_structure_thickness: str | None = None
    flexhone: str | None = None
    flexndi: bool = False
    example_part: str | None = None
    clean_alcohol_alodine: bool = False

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
    bp_damage_clean: str | None
    final_hole_size: int | None
    fit: str | None
    ream_max_bp: bool
    mdr_code: str | None
    mdr_needed: bool
    mdr_version: str | None
    ndi_name_initials: str | None
    ndi_inspection_date: datetime | None
    ndi_finished: bool
    inspection_status: str | None
    mdr_resubmit: bool
    total_stackup_length: str | None
    stack_up: int | None
    sleeve_bushings: str | None
    countersinked: bool
    clean: bool
    cut_sleeve_bushing: bool
    installed: bool
    primer: bool
    surface_corrosion: bool
    nutplate_inspection: str | None
    nutplate_surface_corrosion: str | None
    nutplate_test: str | None
    total_structure_thickness: str | None
    flexhone: str | None
    flexndi: bool
    example_part: str | None
    clean_alcohol_alodine: bool
    created_at: datetime
    steps: list[HoleStepOut] = []
    parts: list[HolePartOut] = []

    class Config:
        from_attributes = True


class MdrCaseIn(BaseModel):
    aircraft_id: int | None = None
    aircraft_an: str | None = None
    aircraft_serial_number: str | None = None
    aircraft_arrival_date: datetime | None = None
    panel_id: int | None = None
    panel_number: int | None = None
    hole_ids: str | None = None
    resubmit: bool = False
    request_sent: bool = False
    mdr_number: str | None = None
    mdr_version: str | None = None
    ed_number: str | None = None
    subject: str | None = None
    status: str | None = None
    dcm_check: str | None = None
    submitted_by: str | None = None
    submit_list_date: datetime | None = None
    request_date: datetime | None = None
    need_date: datetime | None = None
    approval_date: datetime | None = None
    approved: bool = False
    tier2: bool = False


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


class CorrosionReportRowOut(BaseModel):
    hole_id: int
    aircraft_an: str | None
    panel_number: int
    hole_number: int
    inspection_status: str | None
    mdr_code: str | None
    mdr_version: str | None
    ndi_finished: bool
    final_hole_size: int | None
    max_bp_diameter: int | None
    created_at: datetime


class MdrPowerpointInfoRowOut(BaseModel):
    mdr_case_id: int
    panel_id: int | None
    panel_number: int | None
    aircraft_an: str | None
    mdr_number: str | None
    mdr_version: str | None
    subject: str | None
    status: str | None
    submitted_by: str | None
    request_date: datetime | None
    need_date: datetime | None


class MdrRequestDetailIn(BaseModel):
    panel_id: int | None = None
    tve: str | None = None
    panel_number: int | None = None
    task_type: str | None = None
    fms_or_non_fms: str | None = None
    releasability: str | None = None
    technical_product_number: str | None = None
    technical_product_title: str | None = None
    submitter_name: str | None = None
    location: str | None = None
    mdr_type: str | None = None
    serial_number: str | None = None
    part_number: str | None = None
    internal_reference_number: str | None = None
    cr_ecp: str | None = None
    discrepancy_type: str | None = None
    cause_code_discrepant_work: str | None = None
    resubmit_reason: str | None = None
    defect_code: str | None = None
    access_location: str | None = None
    date_due_to_field: datetime | None = None
    lcn: str | None = None
    lcn_description: str | None = None
    inspection_criteria: str | None = None
    mgi_required: str | None = None
    mgi_number: str | None = None
    discovered_during: str | None = None
    when_discovered: str | None = None
    discovered_by: str | None = None
    date_discovered: datetime | None = None
    problem_statement: str | None = None
    technical_product_details_summary: str | None = None
    tms: str | None = None
    email: str | None = None
    confirm_email: str | None = None

    @model_validator(mode="after")
    def validate_required_fields(self):
        required_text_fields = {
            "tve": self.tve,
            "mdr_type": self.mdr_type,
            "part_number": self.part_number,
            "problem_statement": self.problem_statement,
            "discovered_by": self.discovered_by,
            "when_discovered": self.when_discovered,
        }
        missing = [name for name, value in required_text_fields.items() if not (value and value.strip())]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        if self.email and not self.confirm_email:
            raise ValueError("confirm_email is required when email is provided")
        if self.email and self.confirm_email and self.email.strip().lower() != self.confirm_email.strip().lower():
            raise ValueError("confirm_email must match email")

        if self.date_due_to_field and self.date_discovered and self.date_due_to_field < self.date_discovered:
            raise ValueError("date_due_to_field cannot be earlier than date_discovered")

        return self


class MdrRequestDetailOut(BaseModel):
    id: int
    panel_id: int | None
    tve: str | None
    panel_number: int | None
    task_type: str | None
    fms_or_non_fms: str | None
    releasability: str | None
    technical_product_number: str | None
    technical_product_title: str | None
    submitter_name: str | None
    location: str | None
    mdr_type: str | None
    serial_number: str | None
    part_number: str | None
    internal_reference_number: str | None
    cr_ecp: str | None
    discrepancy_type: str | None
    cause_code_discrepant_work: str | None
    resubmit_reason: str | None
    defect_code: str | None
    access_location: str | None
    date_due_to_field: datetime | None
    lcn: str | None
    lcn_description: str | None
    inspection_criteria: str | None
    mgi_required: str | None
    mgi_number: str | None
    discovered_during: str | None
    when_discovered: str | None
    discovered_by: str | None
    date_discovered: datetime | None
    problem_statement: str | None
    technical_product_details_summary: str | None
    tms: str | None
    email: str | None
    confirm_email: str | None

    class Config:
        from_attributes = True


class LookupStatusCodeOut(BaseModel):
    id: int
    status_code: str | None
    status_code_dcm: str | None

    class Config:
        from_attributes = True


class LookupMdrOptionOut(BaseModel):
    id: int
    lcn: str | None
    discrepancy_type: str | None
    cause_code_discrepant_work: str | None
    when_discovered: str | None
    discovered_by: str | None

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


class AircraftCreateIn(BaseModel):
    an: str
    serial_number: str | None = None


class PanelCreateIn(BaseModel):
    aircraft_id: int
    panel_number: int = Field(ge=0)


class AuthMeOut(BaseModel):
    username: str
    role: str


class AuthMeUpdateIn(BaseModel):
    current_password: str
    new_username: str | None = None
    new_password: str | None = None


class AppUserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class AppUserCreateIn(BaseModel):
    username: str
    password: str
    role: str
    is_active: bool = True


class AppUserRoleUpdateIn(BaseModel):
    role: str


class AppUserActiveUpdateIn(BaseModel):
    is_active: bool


class GlobalSearchResultOut(BaseModel):
    kind: str
    title: str
    subtitle: str | None
    route: str


class AuditEventOut(BaseModel):
    id: int
    action: str
    entity: str
    entity_id: int | None
    details: str | None
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    username: str
    role: str


class LogoutOut(BaseModel):
    ok: bool
