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
  mdr_resubmit: boolean;
  total_stackup_length: string | null;
  stack_up: number | null;
  sleeve_bushings: string | null;
  countersinked: boolean;
  clean: boolean;
  cut_sleeve_bushing: boolean;
  installed: boolean;
  primer: boolean;
  surface_corrosion: boolean;
  nutplate_inspection: string | null;
  nutplate_surface_corrosion: string | null;
  total_structure_thickness: string | null;
  flexhone: string | null;
  flexndi: boolean;
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
  mdr_resubmit: boolean;
  total_stackup_length: string | null;
  stack_up: number | null;
  sleeve_bushings: string | null;
  countersinked: boolean;
  clean: boolean;
  cut_sleeve_bushing: boolean;
  installed: boolean;
  primer: boolean;
  surface_corrosion: boolean;
  nutplate_inspection: string | null;
  nutplate_surface_corrosion: string | null;
  total_structure_thickness: string | null;
  flexhone: string | null;
  flexndi: boolean;
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
  aircraft_id: number | null;
  aircraft_an: string | null;
  aircraft_serial_number: string | null;
  aircraft_arrival_date: string | null;
  panel_id: number | null;
  panel_number: number | null;
  hole_ids: string | null;
  resubmit: boolean;
  request_sent: boolean;
  mdr_number: string | null;
  mdr_version: string | null;
  ed_number: string | null;
  subject: string | null;
  status: string | null;
  dcm_check: string | null;
  submitted_by: string | null;
  submit_list_date: string | null;
  request_date: string | null;
  need_date: string | null;
  approval_date: string | null;
  approved: boolean;
  tier2: boolean;
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
  panel_number: number | null;
  task_type: string | null;
  fms_or_non_fms: string | null;
  releasability: string | null;
  technical_product_number: string | null;
  technical_product_title: string | null;
  submitter_name: string | null;
  location: string | null;
  mdr_type: string | null;
  serial_number: string | null;
  part_number: string | null;
  internal_reference_number: string | null;
  cr_ecp: string | null;
  discrepancy_type: string | null;
  cause_code_discrepant_work: string | null;
  resubmit_reason: string | null;
  defect_code: string | null;
  access_location: string | null;
  date_due_to_field: string | null;
  lcn: string | null;
  lcn_description: string | null;
  inspection_criteria: string | null;
  mgi_required: string | null;
  mgi_number: string | null;
  discovered_during: string | null;
  when_discovered: string | null;
  discovered_by: string | null;
  date_discovered: string | null;
  problem_statement: string | null;
  technical_product_details_summary: string | null;
  tms: string | null;
  email: string | null;
  confirm_email: string | null;
}

export interface LookupStatusCodeDto {
  id: number;
  status_code: string | null;
  status_code_dcm: string | null;
}

export interface LookupMdrOptionDto {
  id: number;
  lcn: string | null;
  discrepancy_type: string | null;
  cause_code_discrepant_work: string | null;
  when_discovered: string | null;
  discovered_by: string | null;
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

export interface CorrosionReportRowDto {
  hole_id: number;
  aircraft_an: string | null;
  panel_number: number;
  hole_number: number;
  inspection_status: string | null;
  mdr_code: string | null;
  mdr_version: string | null;
  ndi_finished: boolean;
  final_hole_size: number | null;
  max_bp_diameter: number | null;
  created_at: string;
}

export interface MdrPowerpointInfoRowDto {
  mdr_case_id: number;
  panel_id: number | null;
  panel_number: number | null;
  aircraft_an: string | null;
  mdr_number: string | null;
  mdr_version: string | null;
  subject: string | null;
  status: string | null;
  submitted_by: string | null;
  request_date: string | null;
  need_date: string | null;
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
