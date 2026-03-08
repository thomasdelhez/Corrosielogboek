import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AppConfigService } from '../../../core/services/app-config.service';
import { HttpService } from '../../../shared/services/http.service';
import {
  AircraftDto,
  CreateHoleBatchResultDto,
  HoleDto,
  HoleTrackerRowDto,
  InspectionQueueRowDto,
  InstallationTrackerRowDto,
  MdrCaseDto,
  MdrRemarkDto,
  MdrRequestDetailDto,
  NdiQueueRowDto,
  NdiReportDto,
  OrderingTrackerRowDto,
  PanelSummaryDto,
  UpdateHoleInputDto,
  UpdateHolePartInputDto,
  UpdateHoleStepInputDto,
} from '../models/corrosion.dtos';
import {
  CreateAircraftInput,
  CreateHoleBatchResult,
  CreateHoleBatchResultRow,
  CreateHoleInput,
  CreateMdrCaseInput,
  CreateMdrRemarkInput,
  CreatePanelInput,
  CreateNdiReportInput,
  UpdateHoleInput,
  UpdateHolePartInput,
  UpdateHoleStepInput,
} from '../models/corrosion.inputs';
import {
  Aircraft,
  Hole,
  HolePart,
  HoleStep,
  HoleTrackerRow,
  InspectionQueueRow,
  InstallationTrackerRow,
  MdrCase,
  MdrRemark,
  MdrRequestDetail,
  NdiQueueRow,
  NdiReport,
  OrderingTrackerRow,
  PanelSummary,
} from '../models/corrosion.models';

@Injectable({ providedIn: 'root' })
export class CorrosionService {
  private readonly http = inject(HttpService);
  private readonly config = inject(AppConfigService);

  listAircraft(): Observable<Aircraft[]> {
    return this.http
      .get<AircraftDto[]>(`${this.config.apiBaseUrl}/aircraft`)
      .pipe(map((rows) => rows.map((row) => this.toAircraft(row))));
  }

  listPanels(aircraftId?: number): Observable<PanelSummary[]> {
    return this.http
      .get<PanelSummaryDto[]>(`${this.config.apiBaseUrl}/panels`, { aircraft_id: aircraftId })
      .pipe(map((rows) => rows.map((row) => this.toPanelSummary(row))));
  }

  createAircraft(input: CreateAircraftInput): Observable<Aircraft> {
    return this.http
      .post<AircraftDto>(`${this.config.apiBaseUrl}/aircraft`, {
        an: input.an,
        serial_number: input.serialNumber,
      })
      .pipe(map((row) => this.toAircraft(row)));
  }

  createPanel(input: CreatePanelInput): Observable<PanelSummary> {
    return this.http
      .post<PanelSummaryDto>(`${this.config.apiBaseUrl}/panels`, {
        aircraft_id: input.aircraftId,
        panel_number: input.panelNumber,
      })
      .pipe(map((row) => this.toPanelSummary(row)));
  }

  listPanelHoles(panelId: number): Observable<Hole[]> {
    return this.http
      .get<HoleDto[]>(`${this.config.apiBaseUrl}/panels/${panelId}/holes`)
      .pipe(map((rows) => rows.map((row) => this.toHole(row))));
  }

  createBatchHoles(panelId: number, holes: CreateHoleInput[]): Observable<CreateHoleBatchResult> {
    return this.http
      .post<CreateHoleBatchResultDto>(`${this.config.apiBaseUrl}/panels/${panelId}/holes/batch`, {
        holes: holes.map((h) => this.toCreateHoleDto(h)),
      })
      .pipe(map((row) => this.toCreateBatchResult(row)));
  }

  getHole(holeId: number): Observable<Hole> {
    return this.http.get<HoleDto>(`${this.config.apiBaseUrl}/holes/${holeId}`).pipe(map((row) => this.toHole(row)));
  }

  updateHole(holeId: number, input: UpdateHoleInput): Observable<Hole> {
    return this.http
      .put<HoleDto>(`${this.config.apiBaseUrl}/holes/${holeId}`, this.toUpdateDto(input))
      .pipe(map((row) => this.toHole(row)));
  }

  updateHoleSteps(holeId: number, input: UpdateHoleStepInput[]): Observable<Hole> {
    return this.http
      .put<HoleDto>(`${this.config.apiBaseUrl}/holes/${holeId}/steps`, input.map((s) => this.toUpdateStepDto(s)))
      .pipe(map((row) => this.toHole(row)));
  }

  updateHoleParts(holeId: number, input: UpdateHolePartInput[]): Observable<Hole> {
    return this.http
      .put<HoleDto>(`${this.config.apiBaseUrl}/holes/${holeId}/parts`, input.map((p) => this.toUpdatePartDto(p)))
      .pipe(map((row) => this.toHole(row)));
  }

  listMdrCases(panelId?: number): Observable<MdrCase[]> {
    return this.http
      .get<MdrCaseDto[]>(`${this.config.apiBaseUrl}/mdr-cases`, { panel_id: panelId })
      .pipe(map((rows) => rows.map((row) => this.toMdrCase(row))));
  }

  createMdrCase(input: CreateMdrCaseInput): Observable<MdrCase> {
    return this.http
      .post<MdrCaseDto>(`${this.config.apiBaseUrl}/mdr-cases`, {
        panel_id: input.panelId,
        mdr_number: input.mdrNumber,
        mdr_version: input.mdrVersion,
        subject: input.subject,
        status: input.status,
        submitted_by: input.submittedBy,
        request_date: input.requestDate ? input.requestDate.toISOString() : null,
        need_date: input.needDate ? input.needDate.toISOString() : null,
        approved: input.approved,
      })
      .pipe(map((row) => this.toMdrCase(row)));
  }

  updateMdrCase(mdrCaseId: number, input: CreateMdrCaseInput): Observable<MdrCase> {
    return this.http
      .put<MdrCaseDto>(`${this.config.apiBaseUrl}/mdr-cases/${mdrCaseId}`, {
        panel_id: input.panelId,
        mdr_number: input.mdrNumber,
        mdr_version: input.mdrVersion,
        subject: input.subject,
        status: input.status,
        submitted_by: input.submittedBy,
        request_date: input.requestDate ? input.requestDate.toISOString() : null,
        need_date: input.needDate ? input.needDate.toISOString() : null,
        approved: input.approved,
      })
      .pipe(map((row) => this.toMdrCase(row)));
  }

  deleteMdrCase(mdrCaseId: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.config.apiBaseUrl}/mdr-cases/${mdrCaseId}`);
  }

  transitionMdrCase(mdrCaseId: number, toStatus: string): Observable<MdrCase> {
    return this.http
      .post<MdrCaseDto>(`${this.config.apiBaseUrl}/mdr-cases/${mdrCaseId}/transition`, {
        to_status: toStatus,
      })
      .pipe(map((row) => this.toMdrCase(row)));
  }

  listMdrRemarks(mdrCaseId: number): Observable<MdrRemark[]> {
    return this.http
      .get<MdrRemarkDto[]>(`${this.config.apiBaseUrl}/mdr-cases/${mdrCaseId}/remarks`)
      .pipe(map((rows) => rows.map((row) => this.toMdrRemark(row))));
  }

  addMdrRemark(mdrCaseId: number, input: CreateMdrRemarkInput): Observable<MdrRemark> {
    return this.http
      .post<MdrRemarkDto>(`${this.config.apiBaseUrl}/mdr-cases/${mdrCaseId}/remarks`, {
        remark_index: input.remarkIndex,
        remark_text: input.remarkText,
        remark_datetime: input.remarkDatetime ? input.remarkDatetime.toISOString() : null,
      })
      .pipe(map((row) => this.toMdrRemark(row)));
  }

  listNdiReports(holeId: number): Observable<NdiReport[]> {
    return this.http
      .get<NdiReportDto[]>(`${this.config.apiBaseUrl}/holes/${holeId}/ndi-reports`)
      .pipe(map((rows) => rows.map((row) => this.toNdiReport(row))));
  }

  listInstallationTrackers(params: {
    aircraftId?: number | null;
    panelId?: number | null;
    queue?: 'all' | 'ready_for_installation' | 'finished_installation';
    q?: string | null;
  }): Observable<InstallationTrackerRow[]> {
    return this.http
      .get<InstallationTrackerRowDto[]>(`${this.config.apiBaseUrl}/installation-trackers`, {
        aircraft_id: params.aircraftId ?? undefined,
        panel_id: params.panelId ?? undefined,
        queue: params.queue ?? 'all',
        q: params.q ?? undefined,
      })
      .pipe(map((rows) => rows.map((row) => this.toInstallationTrackerRow(row))));
  }

  listHoleTrackers(params: {
    aircraftId?: number | null;
    panelId?: number | null;
    queue?: 'all' | 'max_bp' | 'flexhone' | 'reaming_steps';
    q?: string | null;
  }): Observable<HoleTrackerRow[]> {
    return this.http
      .get<HoleTrackerRowDto[]>(`${this.config.apiBaseUrl}/hole-trackers`, {
        aircraft_id: params.aircraftId ?? undefined,
        panel_id: params.panelId ?? undefined,
        queue: params.queue ?? 'all',
        q: params.q ?? undefined,
      })
      .pipe(map((rows) => rows.map((row) => this.toHoleTrackerRow(row))));
  }

  listInspectionDashboard(params: {
    aircraftId?: number | null;
    panelId?: number | null;
    queue?: 'all' | 'to_be_inspected' | 'marked_as_corroded' | 'marked_as_rifled' | 'marked_as_clean';
    q?: string | null;
  }): Observable<InspectionQueueRow[]> {
    return this.http
      .get<InspectionQueueRowDto[]>(`${this.config.apiBaseUrl}/inspection-dashboard`, {
        aircraft_id: params.aircraftId ?? undefined,
        panel_id: params.panelId ?? undefined,
        queue: params.queue ?? 'all',
        q: params.q ?? undefined,
      })
      .pipe(map((rows) => rows.map((row) => this.toInspectionQueueRow(row))));
  }

  listNdiDashboard(params: {
    aircraftId?: number | null;
    panelId?: number | null;
    queue?: 'all' | 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';
    q?: string | null;
  }): Observable<NdiQueueRow[]> {
    return this.http
      .get<NdiQueueRowDto[]>(`${this.config.apiBaseUrl}/ndi-dashboard`, {
        aircraft_id: params.aircraftId ?? undefined,
        panel_id: params.panelId ?? undefined,
        queue: params.queue ?? 'all',
        q: params.q ?? undefined,
      })
      .pipe(map((rows) => rows.map((row) => this.toNdiQueueRow(row))));
  }

  transitionNdiStatus(holeId: number, toStatus: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished'): Observable<Hole> {
    return this.http
      .post<HoleDto>(`${this.config.apiBaseUrl}/holes/${holeId}/ndi-status`, { to_status: toStatus })
      .pipe(map((row) => this.toHole(row)));
  }

  listMdrRequestDetails(panelId: number): Observable<MdrRequestDetail[]> {
    return this.http
      .get<MdrRequestDetailDto[]>(`${this.config.apiBaseUrl}/panels/${panelId}/mdr-request-details`)
      .pipe(map((rows) => rows.map((row) => this.toMdrRequestDetail(row))));
  }

  listOrderingTracker(params: {
    aircraftId?: number | null;
    panelId?: number | null;
    queue?: 'all' | 'ordering_overview' | 'order_needed' | 'order_status' | 'delivery_status' | 'created_holes';
    q?: string | null;
  }): Observable<OrderingTrackerRow[]> {
    return this.http
      .get<OrderingTrackerRowDto[]>(`${this.config.apiBaseUrl}/ordering-tracker`, {
        aircraft_id: params.aircraftId ?? undefined,
        panel_id: params.panelId ?? undefined,
        queue: params.queue ?? 'all',
        q: params.q ?? undefined,
      })
      .pipe(map((rows) => rows.map((row) => this.toOrderingTrackerRow(row))));
  }

  createNdiReport(holeId: number, input: CreateNdiReportInput): Observable<NdiReport> {
    return this.http
      .post<NdiReportDto>(`${this.config.apiBaseUrl}/holes/${holeId}/ndi-reports`, {
        panel_id: input.panelId,
        hole_id: holeId,
        name_initials: input.nameInitials,
        inspection_date: input.inspectionDate ? input.inspectionDate.toISOString() : null,
        method: input.method,
        tools: input.tools,
        corrosion_position: input.corrosionPosition,
      })
      .pipe(map((row) => this.toNdiReport(row)));
  }

  deleteNdiReport(reportId: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.config.apiBaseUrl}/ndi-reports/${reportId}`);
  }

  private toCreateHoleDto(input: CreateHoleInput): {
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
    steps: UpdateHoleStepInputDto[];
    parts: UpdateHolePartInputDto[];
  } {
    return {
      hole_number: input.holeNumber,
      max_bp_diameter: input.maxBpDiameter,
      final_hole_size: input.finalHoleSize,
      fit: input.fit,
      mdr_code: input.mdrCode,
      mdr_version: input.mdrVersion,
      ndi_name_initials: input.ndiNameInitials,
      ndi_inspection_date: input.ndiInspectionDate ? input.ndiInspectionDate.toISOString() : null,
      ndi_finished: input.ndiFinished,
      inspection_status: input.inspectionStatus,
      steps: input.steps.map((s) => this.toUpdateStepDto(s)),
      parts: input.parts.map((p) => this.toUpdatePartDto(p)),
    };
  }

  private toUpdateDto(input: UpdateHoleInput): UpdateHoleInputDto {
    return {
      max_bp_diameter: input.maxBpDiameter,
      final_hole_size: input.finalHoleSize,
      fit: input.fit,
      mdr_code: input.mdrCode,
      mdr_version: input.mdrVersion,
      ndi_name_initials: input.ndiNameInitials,
      ndi_inspection_date: input.ndiInspectionDate ? input.ndiInspectionDate.toISOString() : null,
      ndi_finished: input.ndiFinished,
      inspection_status: input.inspectionStatus,
    };
  }

  private toUpdateStepDto(input: UpdateHoleStepInput): UpdateHoleStepInputDto {
    return {
      step_no: input.stepNo,
      size_value: input.sizeValue,
      visual_damage_check: input.visualDamageCheck,
      ream_flag: input.reamFlag,
      mdr_flag: input.mdrFlag,
      ndi_flag: input.ndiFlag,
    };
  }

  private toUpdatePartDto(input: UpdateHolePartInput): UpdateHolePartInputDto {
    return {
      slot_no: input.slotNo,
      part_number: input.partNumber,
      part_length: input.partLength,
      bushing_type: input.bushingType,
      standard_custom: input.standardCustom,
      ordered_flag: input.orderedFlag,
      delivered_flag: input.deliveredFlag,
      status: input.status,
    };
  }

  private toHole(dto: HoleDto): Hole {
    return {
      id: dto.id,
      panelId: dto.panel_id,
      holeNumber: dto.hole_number,
      maxBpDiameter: dto.max_bp_diameter,
      finalHoleSize: dto.final_hole_size,
      fit: dto.fit,
      mdrCode: dto.mdr_code,
      mdrVersion: dto.mdr_version,
      ndiNameInitials: dto.ndi_name_initials,
      ndiInspectionDate: dto.ndi_inspection_date ? new Date(dto.ndi_inspection_date) : null,
      ndiFinished: dto.ndi_finished,
      inspectionStatus: dto.inspection_status,
      createdAt: new Date(dto.created_at),
      steps: dto.steps.map((step) => this.toHoleStep(step)),
      parts: dto.parts.map((part) => this.toHolePart(part)),
    };
  }

  private toHoleStep(step: HoleDto['steps'][number]): HoleStep {
    return {
      id: step.id,
      stepNo: step.step_no,
      sizeValue: step.size_value,
      visualDamageCheck: step.visual_damage_check,
      reamFlag: step.ream_flag,
      mdrFlag: step.mdr_flag,
      ndiFlag: step.ndi_flag,
    };
  }

  private toHolePart(part: HoleDto['parts'][number]): HolePart {
    return {
      id: part.id,
      slotNo: part.slot_no,
      partNumber: part.part_number,
      partLength: part.part_length,
      bushingType: part.bushing_type,
      standardCustom: part.standard_custom,
      orderedFlag: part.ordered_flag,
      deliveredFlag: part.delivered_flag,
      status: part.status,
    };
  }

  private toAircraft(dto: AircraftDto): Aircraft {
    return {
      id: dto.id,
      an: dto.an,
      serialNumber: dto.serial_number,
    };
  }

  private toPanelSummary(dto: PanelSummaryDto): PanelSummary {
    return {
      id: dto.id,
      aircraftId: dto.aircraft_id,
      panelNumber: dto.panel_number,
      holeCount: dto.hole_count,
    };
  }

  private toMdrCase(dto: MdrCaseDto): MdrCase {
    return {
      id: dto.id,
      panelId: dto.panel_id,
      mdrNumber: dto.mdr_number,
      mdrVersion: dto.mdr_version,
      subject: dto.subject,
      status: dto.status,
      submittedBy: dto.submitted_by,
      requestDate: dto.request_date ? new Date(dto.request_date) : null,
      needDate: dto.need_date ? new Date(dto.need_date) : null,
      approved: dto.approved,
    };
  }

  private toMdrRemark(dto: MdrRemarkDto): MdrRemark {
    return {
      id: dto.id,
      mdrCaseId: dto.mdr_case_id,
      remarkIndex: dto.remark_index,
      remarkText: dto.remark_text,
      remarkDatetime: dto.remark_datetime ? new Date(dto.remark_datetime) : null,
    };
  }

  private toNdiReport(dto: NdiReportDto): NdiReport {
    return {
      id: dto.id,
      panelId: dto.panel_id,
      holeId: dto.hole_id,
      nameInitials: dto.name_initials,
      inspectionDate: dto.inspection_date ? new Date(dto.inspection_date) : null,
      method: dto.method,
      tools: dto.tools,
      corrosionPosition: dto.corrosion_position,
    };
  }

  private toMdrRequestDetail(dto: MdrRequestDetailDto): MdrRequestDetail {
    return {
      id: dto.id,
      panelId: dto.panel_id,
      tve: dto.tve,
      mdrType: dto.mdr_type,
      serialNumber: dto.serial_number,
      partNumber: dto.part_number,
      defectCode: dto.defect_code,
      problemStatement: dto.problem_statement,
      discoveredBy: dto.discovered_by,
      dateDiscovered: dto.date_discovered ? new Date(dto.date_discovered) : null,
    };
  }

  private toOrderingTrackerRow(dto: OrderingTrackerRowDto): OrderingTrackerRow {
    return {
      holeId: dto.hole_id,
      holeNumber: dto.hole_number,
      panelId: dto.panel_id,
      panelNumber: dto.panel_number,
      aircraftId: dto.aircraft_id,
      aircraftAn: dto.aircraft_an,
      inspectionStatus: dto.inspection_status,
      orderedParts: dto.ordered_parts,
      deliveredParts: dto.delivered_parts,
      pendingParts: dto.pending_parts,
      orderNeeded: dto.order_needed,
      orderInProgress: dto.order_in_progress,
      deliveryInProgress: dto.delivery_in_progress,
      installationReady: dto.installation_ready,
    };
  }

  private toInstallationTrackerRow(dto: InstallationTrackerRowDto): InstallationTrackerRow {
    return {
      holeId: dto.hole_id,
      holeNumber: dto.hole_number,
      panelId: dto.panel_id,
      panelNumber: dto.panel_number,
      aircraftId: dto.aircraft_id,
      aircraftAn: dto.aircraft_an,
      orderedParts: dto.ordered_parts,
      deliveredParts: dto.delivered_parts,
      pendingParts: dto.pending_parts,
      installationReady: dto.installation_ready,
      queueStatus: dto.queue_status,
    };
  }

  private toHoleTrackerRow(dto: HoleTrackerRowDto): HoleTrackerRow {
    return {
      holeId: dto.hole_id,
      holeNumber: dto.hole_number,
      panelId: dto.panel_id,
      panelNumber: dto.panel_number,
      aircraftId: dto.aircraft_id,
      aircraftAn: dto.aircraft_an,
      maxBpDiameter: dto.max_bp_diameter,
      maxStepSize: dto.max_step_size,
      flexhoneNeeded: dto.flexhone_needed,
      reamingStepCount: dto.reaming_step_count,
      queueStatus: dto.queue_status,
    };
  }

  private toInspectionQueueRow(dto: InspectionQueueRowDto): InspectionQueueRow {
    return {
      holeId: dto.hole_id,
      holeNumber: dto.hole_number,
      panelId: dto.panel_id,
      panelNumber: dto.panel_number,
      aircraftId: dto.aircraft_id,
      aircraftAn: dto.aircraft_an,
      inspectionStatus: dto.inspection_status,
      queueStatus: dto.queue_status,
    };
  }

  private toCreateBatchResult(dto: CreateHoleBatchResultDto): CreateHoleBatchResult {
    return {
      created: dto.created,
      skipped: dto.skipped,
      errors: dto.errors,
      results: dto.results.map((row) => this.toCreateBatchResultRow(row)),
    };
  }

  private toCreateBatchResultRow(row: CreateHoleBatchResultDto['results'][number]): CreateHoleBatchResultRow {
    return {
      holeNumber: row.hole_number,
      holeId: row.hole_id,
      status: row.status,
      detail: row.detail,
    };
  }

  private toNdiQueueRow(dto: NdiQueueRowDto): NdiQueueRow {
    return {
      holeId: dto.hole_id,
      holeNumber: dto.hole_number,
      panelId: dto.panel_id,
      panelNumber: dto.panel_number,
      aircraftId: dto.aircraft_id,
      aircraftAn: dto.aircraft_an,
      inspectionStatus: dto.inspection_status,
      ndiNameInitials: dto.ndi_name_initials,
      ndiInspectionDate: dto.ndi_inspection_date ? new Date(dto.ndi_inspection_date) : null,
      latestReportId: dto.latest_report_id,
      latestReportMethod: dto.latest_report_method,
      latestReportTools: dto.latest_report_tools,
      queueStatus: dto.queue_status,
    };
  }
}
