import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateMdrCaseInput, CreateMdrRemarkInput, MdrRequestDetailInput } from '../models/corrosion.inputs';
import { Aircraft, LookupMdrOption, LookupStatusCode, MdrCase, MdrRemark, MdrRequestDetail, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-mdr-management-page',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  templateUrl: './mdr-management.page.html',
  styleUrl: './mdr-management.page.scss',
})
export class MdrManagementPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly mdrCases = signal<MdrCase[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly creatingMode = signal<boolean>(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly selectedCase = signal<MdrCase | null>(null);
  protected readonly remarks = signal<MdrRemark[]>([]);
  protected readonly requestDetails = signal<MdrRequestDetail[]>([]);
  protected readonly lookupStatusCodes = signal<LookupStatusCode[]>([]);
  protected readonly lookupMdrOptions = signal<LookupMdrOption[]>([]);
  protected readonly message = signal<string>('');
  protected readonly messageType = signal<'success' | 'error' | 'info'>('info');
  protected readonly creatingDetailMode = signal<boolean>(false);
  protected readonly editingDetailId = signal<number | null>(null);
  protected readonly mdrStatusOptions = ['Draft', 'Awaiting Request', 'Request', 'Submit', 'Resubmit', 'In Review', 'Approved', 'Rejected', 'Closed'];
  protected requestDateInput = '';
  protected needDateInput = '';
  protected submitListDateInput = '';
  protected approvalDateInput = '';
  protected requestDetailDateDueInput = '';
  protected requestDetailDateDiscoveredInput = '';

  protected readonly statusOptions = computed(() => {
    const allowed = new Set(this.mdrStatusOptions.map((s) => s.toLowerCase()));
    const fromLookup = this.lookupStatusCodes()
      .map((x) => x.statusCode?.trim())
      .filter((x): x is string => !!x && allowed.has(x.toLowerCase()));
    return fromLookup.length ? fromLookup : this.mdrStatusOptions;
  });
  protected readonly lcnOptions = computed(() => Array.from(new Set(this.lookupMdrOptions().map((x) => x.lcn).filter((x): x is string => !!x))));
  protected readonly discrepancyTypeOptions = computed(() =>
    Array.from(new Set(this.lookupMdrOptions().map((x) => x.discrepancyType).filter((x): x is string => !!x))),
  );
  protected readonly causeCodeOptions = computed(() =>
    Array.from(new Set(this.lookupMdrOptions().map((x) => x.causeCodeDiscrepantWork).filter((x): x is string => !!x))),
  );
  protected readonly discoveredByOptions = computed(() =>
    Array.from(new Set(this.lookupMdrOptions().map((x) => x.discoveredBy).filter((x): x is string => !!x))),
  );
  protected readonly whenDiscoveredOptions = computed(() =>
    Array.from(new Set(this.lookupMdrOptions().map((x) => x.whenDiscovered).filter((x): x is string => !!x))),
  );

  protected form: CreateMdrCaseInput = {
    aircraftId: null,
    aircraftAn: null,
    aircraftSerialNumber: null,
    aircraftArrivalDate: null,
    panelId: null,
    panelNumber: null,
    holeIds: null,
    resubmit: false,
    requestSent: false,
    mdrNumber: null,
    mdrVersion: null,
    edNumber: null,
    subject: null,
    status: 'Draft',
    dcmCheck: null,
    submittedBy: null,
    submitListDate: null,
    requestDate: null,
    needDate: null,
    approvalDate: null,
    approved: false,
    tier2: false,
  };

  protected requestDetailForm: MdrRequestDetailInput = {
    panelId: null,
    tve: null,
    panelNumber: null,
    taskType: null,
    fmsOrNonFms: null,
    releasability: null,
    technicalProductNumber: null,
    technicalProductTitle: null,
    submitterName: null,
    location: null,
    mdrType: null,
    serialNumber: null,
    partNumber: null,
    internalReferenceNumber: null,
    crEcp: null,
    discrepancyType: null,
    causeCodeDiscrepantWork: null,
    resubmitReason: null,
    defectCode: null,
    accessLocation: null,
    dateDueToField: null,
    lcn: null,
    lcnDescription: null,
    inspectionCriteria: null,
    mgiRequired: null,
    mgiNumber: null,
    discoveredDuring: null,
    whenDiscovered: null,
    discoveredBy: null,
    dateDiscovered: null,
    problemStatement: null,
    technicalProductDetailsSummary: null,
    tms: null,
    email: null,
    confirmEmail: null,
  };

  protected remarkForm: CreateMdrRemarkInput = {
    remarkIndex: 1,
    remarkText: '',
    remarkDatetime: null,
  };

  async ngOnInit(): Promise<void> {
    const focusMdrId = Number(this.route.snapshot.queryParamMap.get('focusMdr'));
    const openCreateFromMenu = this.route.snapshot.queryParamMap.get('action') === 'new-case';

    this.loading.set(true);
    const [statusCodes, mdrOptions] = await Promise.all([
      firstValueFrom(this.svc.listLookupStatusCodes()),
      firstValueFrom(this.svc.listLookupMdrOptions()),
    ]);
    this.lookupStatusCodes.set(statusCodes);
    this.lookupMdrOptions.set(mdrOptions);
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    }
    if (Number.isFinite(focusMdrId) && focusMdrId > 0) {
      await this.focusMdrCase(focusMdrId);
    }
    if (openCreateFromMenu && this.canCreateOrEditMdr()) {
      this.startCreate();
    }
    this.loading.set(false);
  }

  async onAircraftChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedAircraftId.set(Number(id));
    const panels = await firstValueFrom(this.svc.listPanels(Number(id)));
    this.panels.set(panels);
    const first = panels[0];
    if (first) {
      this.selectedPanelId.set(first.id);
      await this.onPanelChange(first.id);
    } else {
      this.mdrCases.set([]);
      this.selectedCase.set(null);
      this.remarks.set([]);
      this.requestDetails.set([]);
    }
    this.resetForm();
    this.loading.set(false);
  }

  async onPanelChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedPanelId.set(Number(id));
    this.mdrCases.set(await firstValueFrom(this.svc.listMdrCases(Number(id))));
    this.requestDetails.set(await firstValueFrom(this.svc.listMdrRequestDetails(Number(id))));
    this.selectedCase.set(null);
    this.remarks.set([]);
    this.resetForm();
    this.loading.set(false);
  }

  startCreate(): void {
    if (!this.canCreateOrEditMdr()) return;
    this.resetForm();
    this.creatingMode.set(true);
  }

  startEdit(row: MdrCase): void {
    if (!this.canCreateOrEditMdr()) return;
    this.creatingMode.set(false);
    this.editingId.set(row.id);
    this.form = {
      aircraftId: row.aircraftId,
      aircraftAn: row.aircraftAn,
      aircraftSerialNumber: row.aircraftSerialNumber,
      aircraftArrivalDate: row.aircraftArrivalDate,
      panelId: row.panelId,
      panelNumber: row.panelNumber,
      holeIds: row.holeIds,
      resubmit: row.resubmit,
      requestSent: row.requestSent,
      mdrNumber: row.mdrNumber,
      mdrVersion: row.mdrVersion,
      edNumber: row.edNumber,
      subject: row.subject,
      status: row.status,
      dcmCheck: row.dcmCheck,
      submittedBy: row.submittedBy,
      submitListDate: row.submitListDate,
      requestDate: row.requestDate,
      needDate: row.needDate,
      approvalDate: row.approvalDate,
      approved: row.approved,
      tier2: row.tier2,
    };
    this.requestDateInput = this.toDateInput(row.requestDate);
    this.needDateInput = this.toDateInput(row.needDate);
    this.submitListDateInput = this.toDateInput(row.submitListDate);
    this.approvalDateInput = this.toDateInput(row.approvalDate);
    this.message.set('');
    this.messageType.set('info');
  }

  resetForm(): void {
    this.creatingMode.set(false);
    this.editingId.set(null);
    const aircraft = this.aircraft().find((a) => a.id === this.selectedAircraftId());
    const panel = this.panels().find((p) => p.id === this.selectedPanelId());
    this.form = {
      aircraftId: this.selectedAircraftId(),
      aircraftAn: aircraft?.an ?? null,
      aircraftSerialNumber: aircraft?.serialNumber ?? null,
      aircraftArrivalDate: null,
      panelId: this.selectedPanelId(),
      panelNumber: panel?.panelNumber ?? null,
      holeIds: null,
      resubmit: false,
      requestSent: false,
      mdrNumber: null,
      mdrVersion: null,
      edNumber: null,
      subject: panel ? `Panel ${panel.panelNumber}` : null,
      status: 'Draft',
      dcmCheck: null,
      submittedBy: null,
      submitListDate: null,
      requestDate: null,
      needDate: null,
      approvalDate: null,
      approved: false,
      tier2: false,
    };
    this.requestDateInput = '';
    this.needDateInput = '';
    this.submitListDateInput = '';
    this.approvalDateInput = '';
    this.message.set('');
    this.messageType.set('info');
  }

  async save(): Promise<void> {
    if (!this.canCreateOrEditMdr()) return;
    const panelId = this.selectedPanelId();
    if (!panelId) return;

    const payload: CreateMdrCaseInput = {
      ...this.form,
      panelId,
      panelNumber: this.panels().find((p) => p.id === panelId)?.panelNumber ?? this.form.panelNumber ?? null,
      requestDate: this.fromDateInput(this.requestDateInput),
      needDate: this.fromDateInput(this.needDateInput),
      submitListDate: this.fromDateInput(this.submitListDateInput),
      approvalDate: this.fromDateInput(this.approvalDateInput),
    };
    const payloadError = this.validateMdrCasePayload(payload);
    if (payloadError) {
      this.message.set(payloadError);
      this.messageType.set('error');
      this.toast.error(payloadError);
      return;
    }

    try {
      if (this.editingId()) {
        await firstValueFrom(this.svc.updateMdrCase(this.editingId()!, payload));
        this.message.set('MDR case gewijzigd');
        this.messageType.set('success');
        this.toast.success('MDR case gewijzigd');
      } else {
        await firstValueFrom(this.svc.createMdrCase(payload));
        this.message.set('MDR case aangemaakt');
        this.messageType.set('success');
        this.toast.success('MDR case aangemaakt');
      }
      await this.onPanelChange(panelId);
      this.creatingMode.set(false);
      this.editingId.set(null);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'MDR case opslaan mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async transition(id: number, toStatus: string): Promise<void> {
    if (!this.canTransitionMdr()) return;
    try {
      await firstValueFrom(this.svc.transitionMdrCase(id, toStatus));
      const panelId = this.selectedPanelId();
      if (panelId) await this.onPanelChange(panelId);
      this.message.set(`Status bijgewerkt naar ${toStatus}`);
      this.messageType.set('success');
      this.toast.success(`Status bijgewerkt naar ${toStatus}`);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'MDR transitie mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async selectCase(row: MdrCase): Promise<void> {
    this.selectedCase.set(row);
    this.remarks.set(await firstValueFrom(this.svc.listMdrRemarks(row.id)));
  }

  async addRemark(): Promise<void> {
    if (!this.canCreateOrEditMdr()) return;
    const selected = this.selectedCase();
    if (!selected || !this.remarkForm.remarkText.trim()) return;
    try {
      await firstValueFrom(this.svc.addMdrRemark(selected.id, { ...this.remarkForm }));
      this.remarks.set(await firstValueFrom(this.svc.listMdrRemarks(selected.id)));
      this.remarkForm = { remarkIndex: 1, remarkText: '', remarkDatetime: null };
      this.message.set('Remark toegevoegd');
      this.messageType.set('success');
      this.toast.success('Remark toegevoegd');
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Remark toevoegen mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  startCreateDetail(): void {
    if (!this.canManageRequestDetails()) return;
    this.resetRequestDetailForm();
    this.creatingDetailMode.set(true);
  }

  startEditDetail(row: MdrRequestDetail): void {
    if (!this.canManageRequestDetails()) return;
    this.creatingDetailMode.set(false);
    this.editingDetailId.set(row.id);
    this.requestDetailForm = {
      panelId: row.panelId,
      tve: row.tve,
      panelNumber: row.panelNumber,
      taskType: row.taskType,
      fmsOrNonFms: row.fmsOrNonFms,
      releasability: row.releasability,
      technicalProductNumber: row.technicalProductNumber,
      technicalProductTitle: row.technicalProductTitle,
      submitterName: row.submitterName,
      location: row.location,
      mdrType: row.mdrType,
      serialNumber: row.serialNumber,
      partNumber: row.partNumber,
      internalReferenceNumber: row.internalReferenceNumber,
      crEcp: row.crEcp,
      discrepancyType: row.discrepancyType,
      causeCodeDiscrepantWork: row.causeCodeDiscrepantWork,
      resubmitReason: row.resubmitReason,
      defectCode: row.defectCode,
      accessLocation: row.accessLocation,
      dateDueToField: row.dateDueToField,
      lcn: row.lcn,
      lcnDescription: row.lcnDescription,
      inspectionCriteria: row.inspectionCriteria,
      mgiRequired: row.mgiRequired,
      mgiNumber: row.mgiNumber,
      discoveredDuring: row.discoveredDuring,
      whenDiscovered: row.whenDiscovered,
      discoveredBy: row.discoveredBy,
      dateDiscovered: row.dateDiscovered,
      problemStatement: row.problemStatement,
      technicalProductDetailsSummary: row.technicalProductDetailsSummary,
      tms: row.tms,
      email: row.email,
      confirmEmail: row.confirmEmail,
    };
    this.requestDetailDateDueInput = this.toDateInput(row.dateDueToField);
    this.requestDetailDateDiscoveredInput = this.toDateInput(row.dateDiscovered);
  }

  resetRequestDetailForm(): void {
    this.creatingDetailMode.set(false);
    this.editingDetailId.set(null);
    this.requestDetailForm = {
      panelId: this.selectedPanelId(),
      panelNumber: this.panels().find((p) => p.id === this.selectedPanelId())?.panelNumber ?? null,
      tve: null,
      taskType: null,
      fmsOrNonFms: null,
      releasability: null,
      technicalProductNumber: null,
      technicalProductTitle: null,
      submitterName: null,
      location: null,
      mdrType: null,
      serialNumber: null,
      partNumber: null,
      internalReferenceNumber: null,
      crEcp: null,
      discrepancyType: null,
      causeCodeDiscrepantWork: null,
      resubmitReason: null,
      defectCode: null,
      accessLocation: null,
      dateDueToField: null,
      discoveredBy: null,
      whenDiscovered: null,
      lcn: null,
      lcnDescription: null,
      inspectionCriteria: null,
      mgiRequired: null,
      mgiNumber: null,
      discoveredDuring: null,
      dateDiscovered: null,
      problemStatement: null,
      technicalProductDetailsSummary: null,
      tms: null,
      email: null,
      confirmEmail: null,
    };
    this.requestDetailDateDueInput = '';
    this.requestDetailDateDiscoveredInput = '';
  }

  async saveRequestDetail(): Promise<void> {
    if (!this.canManageRequestDetails()) return;
    const panelId = this.selectedPanelId();
    if (!panelId) return;
    const payload: MdrRequestDetailInput = {
      ...this.requestDetailForm,
      panelId,
      panelNumber: this.panels().find((p) => p.id === panelId)?.panelNumber ?? null,
      dateDueToField: this.fromDateInput(this.requestDetailDateDueInput),
      dateDiscovered: this.fromDateInput(this.requestDetailDateDiscoveredInput),
    };
    const payloadError = this.validateRequestDetailPayload(payload);
    if (payloadError) {
      this.message.set(payloadError);
      this.messageType.set('error');
      this.toast.error(payloadError);
      return;
    }
    try {
      if (this.editingDetailId()) {
        await firstValueFrom(this.svc.updateMdrRequestDetail(this.editingDetailId()!, payload));
      } else {
        await firstValueFrom(this.svc.createMdrRequestDetail(panelId, payload));
      }
      this.requestDetails.set(await firstValueFrom(this.svc.listMdrRequestDetails(panelId)));
      this.resetRequestDetailForm();
      this.message.set('Request detail opgeslagen');
      this.messageType.set('success');
      this.toast.success('Request detail opgeslagen');
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Request detail opslaan mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async deleteRequestDetail(id: number): Promise<void> {
    if (!this.canDeleteRequestDetails()) return;
    if (!confirm('Request detail verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrRequestDetail(id));
    const panelId = this.selectedPanelId();
    if (panelId) {
      this.requestDetails.set(await firstValueFrom(this.svc.listMdrRequestDetails(panelId)));
    }
  }

  canCreateOrEditMdr(): boolean {
    return this.permissions.canMdrEdit(this.auth.currentUser());
  }

  canTransitionMdr(): boolean {
    return this.permissions.canMdrTransition(this.auth.currentUser());
  }

  canDeleteMdr(): boolean {
    return this.permissions.canMdrDelete(this.auth.currentUser());
  }

  canManageRequestDetails(): boolean {
    return this.permissions.canMdrRequestDetailEdit(this.auth.currentUser());
  }

  canDeleteRequestDetails(): boolean {
    return this.permissions.canMdrRequestDetailDelete(this.auth.currentUser());
  }

  caseLabel(m: MdrCase): string {
    return `#${m.id} ${m.mdrNumber ?? '(zonder nummer)'} — ${m.subject ?? '(zonder subject)'}`;
  }

  async deleteMdr(id: number): Promise<void> {
    if (!this.canDeleteMdr()) return;
    if (!confirm('MDR case verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrCase(id));
    const panelId = this.selectedPanelId();
    if (panelId) await this.onPanelChange(panelId);
  }

  private toDateInput(value: Date | null): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
  }

  private fromDateInput(value: string): Date | null {
    if (!value) return null;
    return new Date(`${value}T00:00:00`);
  }

  mdrInlineErrors(): string[] {
    const panelId = this.selectedPanelId();
    if (!panelId) return ['Selecteer eerst een panel.'];
    const payload: CreateMdrCaseInput = {
      ...this.form,
      panelId,
      panelNumber: this.panels().find((p) => p.id === panelId)?.panelNumber ?? this.form.panelNumber ?? null,
      requestDate: this.fromDateInput(this.requestDateInput),
      needDate: this.fromDateInput(this.needDateInput),
      submitListDate: this.fromDateInput(this.submitListDateInput),
      approvalDate: this.fromDateInput(this.approvalDateInput),
    };
    const msg = this.validateMdrCasePayload(payload);
    return msg ? [msg] : [];
  }

  requestDetailInlineErrors(): string[] {
    const panelId = this.selectedPanelId();
    if (!panelId) return ['Selecteer eerst een panel.'];
    const payload: MdrRequestDetailInput = {
      ...this.requestDetailForm,
      panelId,
      panelNumber: this.panels().find((p) => p.id === panelId)?.panelNumber ?? null,
      dateDueToField: this.fromDateInput(this.requestDetailDateDueInput),
      dateDiscovered: this.fromDateInput(this.requestDetailDateDiscoveredInput),
    };
    const msg = this.validateRequestDetailPayload(payload);
    return msg ? [msg] : [];
  }

  private validateMdrCasePayload(payload: CreateMdrCaseInput): string | null {
    const status = (payload.status ?? 'Draft').trim();
    const requiresCaseInfo = ['Request', 'Submit', 'Resubmit', 'Submitted', 'In Review', 'Approved', 'Rejected', 'Closed'].includes(status);
    const requiresNeedDate = ['Submit', 'Resubmit', 'Submitted', 'In Review', 'Approved', 'Rejected', 'Closed'].includes(status);
    const requiresSubmitter = ['Submit', 'Submitted', 'In Review', 'Approved', 'Rejected', 'Closed'].includes(status);

    if (requiresCaseInfo) {
      if (!payload.mdrNumber?.trim()) return 'MDR Number is verplicht voor deze status.';
      if (!payload.subject?.trim()) return 'Subject is verplicht voor deze status.';
      if (!payload.requestDate) return 'Request Date is verplicht voor deze status.';
    }
    if (requiresNeedDate && !payload.needDate) return 'Need Date is verplicht voor deze status.';
    if (requiresSubmitter && !payload.submittedBy?.trim()) return 'Submitted by is verplicht voor deze status.';
    if (status === 'Approved' && !payload.approvalDate) return 'Approval Date is verplicht bij Approved status.';
    if (payload.requestSent && !payload.requestDate) return 'Request Date is verplicht als Request Sent is aangevinkt.';
    if (payload.approved && !payload.approvalDate) return 'Approval Date is verplicht als Approved is aangevinkt.';
    return null;
  }

  private validateRequestDetailPayload(payload: MdrRequestDetailInput): string | null {
    const required: Array<[string, string | null]> = [
      ['TVE', payload.tve],
      ['MDR Type', payload.mdrType],
      ['Part Number', payload.partNumber],
      ['Problem Statement', payload.problemStatement],
      ['Discovered By', payload.discoveredBy],
      ['When Discovered', payload.whenDiscovered],
    ];
    const missing = required.filter(([, value]) => !value?.trim()).map(([label]) => label);
    if (missing.length) return `Verplichte velden ontbreken: ${missing.join(', ')}`;

    if (payload.email?.trim() && !payload.confirmEmail?.trim()) {
      return 'Confirm Email is verplicht als Email is ingevuld.';
    }
    if ((payload.email?.trim() ?? '').toLowerCase() !== (payload.confirmEmail?.trim() ?? '').toLowerCase() && payload.email?.trim()) {
      return 'Confirm Email moet gelijk zijn aan Email.';
    }
    if (payload.dateDueToField && payload.dateDiscovered && payload.dateDueToField < payload.dateDiscovered) {
      return 'Date Due To Field kan niet vóór Date Discovered liggen.';
    }

    return null;
  }

  private async focusMdrCase(mdrCaseId: number): Promise<void> {
    const allCases = await firstValueFrom(this.svc.listMdrCases());
    const target = allCases.find((row) => row.id === mdrCaseId);
    if (!target || !target.aircraftId || !target.panelId) return;

    if (this.selectedAircraftId() !== target.aircraftId) {
      await this.onAircraftChange(target.aircraftId);
    }
    if (this.selectedPanelId() !== target.panelId) {
      await this.onPanelChange(target.panelId);
    }

    const row = this.mdrCases().find((x) => x.id === mdrCaseId);
    if (row) {
      await this.selectCase(row);
    }
  }

}
