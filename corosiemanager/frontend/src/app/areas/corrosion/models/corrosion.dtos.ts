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

export interface UpdateHoleStepInputDto {
  step_no: number;
  size_value: number | null;
  visual_damage_check: string | null;
  ream_flag: boolean | null;
  mdr_flag: boolean | null;
  ndi_flag: boolean | null;
}

export interface UpdateHolePartInputDto {
  slot_no: number;
  part_number: string | null;
  part_length: number | null;
  bushing_type: string | null;
  standard_custom: string | null;
  ordered_flag: boolean | null;
  delivered_flag: boolean | null;
  status: string | null;
}

export interface AircraftDto {
  id: number;
  an: string;
  serial_number: string | null;
}

export interface PanelSummaryDto {
  id: number;
  aircraft_id: number | null;
  panel_number: number;
  hole_count: number;
}

export interface MdrCaseDto {
  id: number;
  panel_id: number | null;
  mdr_number: string | null;
  mdr_version: string | null;
  subject: string | null;
  status: string | null;
  submitted_by: string | null;
  request_date: string | null;
  need_date: string | null;
  approved: boolean;
}

export interface MdrRemarkDto {
  id: number;
  mdr_case_id: number;
  remark_index: number;
  remark_text: string;
  remark_datetime: string | null;
}

export interface NdiReportDto {
  id: number;
  panel_id: number | null;
  hole_id: number | null;
  name_initials: string | null;
  inspection_date: string | null;
  method: string | null;
  tools: string | null;
  corrosion_position: string | null;
}

export interface MdrRequestDetailDto {
  id: number;
  panel_id: number | null;
  tve: string | null;
  mdr_type: string | null;
  serial_number: string | null;
  part_number: string | null;
  defect_code: string | null;
  problem_statement: string | null;
  discovered_by: string | null;
  date_discovered: string | null;
}

export interface OrderingTrackerRowDto {
  hole_id: number;
  hole_number: number;
  panel_id: number;
  panel_number: number;
  aircraft_id: number | null;
  aircraft_an: string | null;
  inspection_status: string | null;
  ordered_parts: number;
  delivered_parts: number;
  pending_parts: number;
  order_needed: boolean;
  order_in_progress: boolean;
  delivery_in_progress: boolean;
  installation_ready: boolean;
}

export interface NdiQueueRowDto {
  hole_id: number;
  hole_number: number;
  panel_id: number;
  panel_number: number;
  aircraft_id: number | null;
  aircraft_an: string | null;
  inspection_status: string | null;
  ndi_name_initials: string | null;
  ndi_inspection_date: string | null;
  latest_report_id: number | null;
  latest_report_method: string | null;
  latest_report_tools: string | null;
  queue_status: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';
}

export interface InspectionQueueRowDto {
  hole_id: number;
  hole_number: number;
  panel_id: number;
  panel_number: number;
  aircraft_id: number | null;
  aircraft_an: string | null;
  inspection_status: string | null;
  queue_status: 'to_be_inspected' | 'marked_as_corroded' | 'marked_as_rifled' | 'marked_as_clean';
}

export interface HoleTrackerRowDto {
  hole_id: number;
  hole_number: number;
  panel_id: number;
  panel_number: number;
  aircraft_id: number | null;
  aircraft_an: string | null;
  max_bp_diameter: number | null;
  max_step_size: number | null;
  flexhone_needed: boolean;
  reaming_step_count: number;
  queue_status: 'max_bp' | 'flexhone' | 'reaming_steps';
}

export interface InstallationTrackerRowDto {
  hole_id: number;
  hole_number: number;
  panel_id: number;
  panel_number: number;
  aircraft_id: number | null;
  aircraft_an: string | null;
  ordered_parts: number;
  delivered_parts: number;
  pending_parts: number;
  installation_ready: boolean;
  queue_status: 'ready_for_installation' | 'finished_installation';
}

export interface CreateHoleBatchResultRowDto {
  hole_number: number;
  hole_id: number | null;
  status: 'created' | 'skipped' | 'error';
  detail: string | null;
}

export interface CreateHoleBatchResultDto {
  created: number;
  skipped: number;
  errors: number;
  results: CreateHoleBatchResultRowDto[];
}
