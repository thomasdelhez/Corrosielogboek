export interface HoleStepDto {
  id: number;
  step_no: number;
  size_value: number | null;
  visual_damage_check: string | null;
  ream_flag: boolean | null;
  mdr_flag: boolean | null;
  ndi_flag: boolean | null;
}

export interface HolePartDto {
  id: number;
  slot_no: number;
  part_number: string | null;
  part_length: number | null;
  bushing_type: string | null;
  standard_custom: string | null;
  ordered_flag: boolean | null;
  delivered_flag: boolean | null;
  status: string | null;
}

export interface HoleDto {
  id: number;
  panel_id: number;
  hole_number: number;
  max_bp_diameter: number | null;
  final_hole_size: number | null;
  fit: string | null;
  mdr_code: string | null;
  mdr_version: string | null;
  ndi_name_initials: string | null;
  ndi_inspection_date: string | null;
  ndi_finished: boolean;
  inspection_status: string | null;
  created_at: string;
  steps: HoleStepDto[];
  parts: HolePartDto[];
}

export interface UpdateHoleInputDto {
  max_bp_diameter: number | null;
  final_hole_size: number | null;
  fit: string | null;
  mdr_code: string | null;
  mdr_version: string | null;
  ndi_name_initials: string | null;
  ndi_inspection_date: string | null;
  ndi_finished: boolean;
  inspection_status: string | null;
}
