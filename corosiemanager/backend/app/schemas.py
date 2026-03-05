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
