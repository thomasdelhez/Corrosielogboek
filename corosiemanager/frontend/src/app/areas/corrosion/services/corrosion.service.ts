import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AppConfigService } from '../../../core/services/app-config.service';
import { HttpService } from '../../../shared/services/http.service';
import {
  HoleDto,
  MdrCaseDto,
  MdrRequestDetailDto,
  NdiReportDto,
  PanelSummaryDto,
  UpdateHoleInputDto,
  UpdateHolePartInputDto,
  UpdateHoleStepInputDto,
} from '../models/corrosion.dtos';
import {
  CreateMdrCaseInput,
  CreateNdiReportInput,
  UpdateHoleInput,
  UpdateHolePartInput,
  UpdateHoleStepInput,
} from '../models/corrosion.inputs';
import { Hole, HolePart, HoleStep, MdrCase, MdrRequestDetail, NdiReport, PanelSummary } from '../models/corrosion.models';

@Injectable({ providedIn: 'root' })
export class CorrosionService {
  private readonly http = inject(HttpService);
  private readonly config = inject(AppConfigService);

  listPanels(): Observable<PanelSummary[]> {
    return this.http
      .get<PanelSummaryDto[]>(`${this.config.apiBaseUrl}/panels`)
      .pipe(map((rows) => rows.map((row) => this.toPanelSummary(row))));
  }

  listPanelHoles(panelId: number): Observable<Hole[]> {
    return this.http
      .get<HoleDto[]>(`${this.config.apiBaseUrl}/panels/${panelId}/holes`)
      .pipe(map((rows) => rows.map((row) => this.toHole(row))));
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

  listNdiReports(holeId: number): Observable<NdiReport[]> {
    return this.http
      .get<NdiReportDto[]>(`${this.config.apiBaseUrl}/holes/${holeId}/ndi-reports`)
      .pipe(map((rows) => rows.map((row) => this.toNdiReport(row))));
  }

  listMdrRequestDetails(panelId: number): Observable<MdrRequestDetail[]> {
    return this.http
      .get<MdrRequestDetailDto[]>(`${this.config.apiBaseUrl}/panels/${panelId}/mdr-request-details`)
      .pipe(map((rows) => rows.map((row) => this.toMdrRequestDetail(row))));
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

  private toPanelSummary(dto: PanelSummaryDto): PanelSummary {
    return {
      id: dto.id,
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
}
