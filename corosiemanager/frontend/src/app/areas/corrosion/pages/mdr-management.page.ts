import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateMdrCaseInput, CreateMdrRemarkInput, MdrRequestDetailInput } from '../models/corrosion.inputs';
import { Aircraft, LookupMdrOption, LookupStatusCode, MdrCase, MdrRemark, MdrRequestDetail, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-mdr-management-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>

      <section class="card">
        <h2>MDR Management</h2>
        <p class="subtitle">MDR dashboard met queue-overzicht en gecontroleerde status-overgangen.</p>

        <div class="filters">
          <label class="field">
            <span>Aircraft</span>
            <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
              @for (a of aircraft(); track a.id) {
                <option [ngValue]="a.id">{{ a.an }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Panel</span>
            <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
              @for (p of panels(); track p.id) {
                <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
              }
            </select>
          </label>
        </div>

        <div class="actions" style="margin-top:12px;">
          @if (!creatingMode() && !editingId()) {
            <button class="btn-primary" type="button" (click)="startCreate()">+ Nieuwe MDR case</button>
          }
        </div>

        @if (creatingMode() || editingId()) {
          <form class="editor" (ngSubmit)="save()">
            <h3>{{ editingId() ? 'MDR case wijzigen' : 'Nieuwe MDR case' }}</h3>
            <div class="grid">
              <label class="field"><span>MDR Number</span><input [(ngModel)]="form.mdrNumber" name="mdrNumber" /></label>
              <label class="field"><span>Versie</span><input [(ngModel)]="form.mdrVersion" name="mdrVersion" /></label>
              <label class="field">
                <span>Status</span>
                <select [(ngModel)]="form.status" name="status">
                  @for (opt of statusOptions(); track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              </label>
              <label class="field"><span>Submitted by</span><input [(ngModel)]="form.submittedBy" name="submittedBy" /></label>
              <label class="field"><span>ED Number</span><input [(ngModel)]="form.edNumber" name="edNumber" /></label>
              <label class="field"><span>DCM Check</span><input [(ngModel)]="form.dcmCheck" name="dcmCheck" /></label>
              <label class="field"><span>Hole IDs</span><input [(ngModel)]="form.holeIds" name="holeIds" /></label>
              <label class="field"><span>Request Date</span><input [(ngModel)]="requestDateInput" name="requestDateInput" type="date" /></label>
              <label class="field"><span>Need Date</span><input [(ngModel)]="needDateInput" name="needDateInput" type="date" /></label>
              <label class="field"><span>Submit List Date</span><input [(ngModel)]="submitListDateInput" name="submitListDateInput" type="date" /></label>
              <label class="field"><span>Approval Date</span><input [(ngModel)]="approvalDateInput" name="approvalDateInput" type="date" /></label>
              <label class="field"><span><input [(ngModel)]="form.resubmit" name="resubmit" type="checkbox" /> Resubmit</span></label>
              <label class="field"><span><input [(ngModel)]="form.requestSent" name="requestSent" type="checkbox" /> Request Sent</span></label>
              <label class="field"><span><input [(ngModel)]="form.approved" name="approved" type="checkbox" /> Approved</span></label>
              <label class="field"><span><input [(ngModel)]="form.tier2" name="tier2" type="checkbox" /> Tier2</span></label>
              <label class="field full"><span>Subject</span><input [(ngModel)]="form.subject" name="subject" /></label>
            </div>
            <div class="actions">
              <button class="btn-primary" type="submit">{{ editingId() ? 'Opslaan wijzigingen' : 'Aanmaken' }}</button>
              <button class="btn-secondary" type="button" (click)="resetForm()">Annuleren</button>
            </div>
          </form>
        }

        @if (loading()) {
          <p class="state">Laden...</p>
        } @else {
          <div class="queue-grid">
            <section class="queue-card">
              <h3>Awaiting Request ({{ awaiting().length }})</h3>
              @if (awaiting().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of awaiting(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button><button class="btn-secondary inline" (click)="selectCase(m)">Detail</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Request ({{ requestQ().length }})</h3>
              @if (requestQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of requestQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button><button class="btn-secondary inline" (click)="selectCase(m)">Detail</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Submit ({{ submitQ().length }})</h3>
              @if (submitQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of submitQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button><button class="btn-secondary inline" (click)="selectCase(m)">Detail</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Resubmit ({{ resubmitQ().length }})</h3>
              @if (resubmitQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of resubmitQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button><button class="btn-secondary inline" (click)="selectCase(m)">Detail</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>In Review ({{ inReviewQ().length }})</h3>
              @if (inReviewQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of inReviewQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button><button class="btn-secondary inline" (click)="selectCase(m)">Detail</button></div></article> }
              }
            </section>
          </div>

          @if (selectedCase()) {
            <section class="queue-card" style="margin-top:14px;">
              <h3>Case detail #{{ selectedCase()!.id }}</h3>
              <p><strong>MDR:</strong> {{ selectedCase()!.mdrNumber ?? '-' }} · <strong>Status:</strong> {{ selectedCase()!.status ?? '-' }}</p>
              <p><strong>Subject:</strong> {{ selectedCase()!.subject ?? '-' }}</p>

              <h4 style="margin:10px 0 6px;">Remarks</h4>
              @if (remarks().length === 0) { <p class="state">Nog geen remarks</p> } @else {
                @for (r of remarks(); track r.id) {
                  <p style="margin:4px 0;"><strong>V{{ r.remarkIndex }}:</strong> {{ r.remarkText }}</p>
                }
              }

              <div class="actions">
                <input style="flex:1;min-width:260px;" [(ngModel)]="remarkForm.remarkText" placeholder="Nieuwe remark" />
                <select [(ngModel)]="remarkForm.remarkIndex" style="width:90px;">
                  @for (i of [1,2,3,4,5]; track i) { <option [ngValue]="i">V{{ i }}</option> }
                </select>
                <button class="btn-primary" type="button" (click)="addRemark()">Add remark</button>
              </div>

              <h4 style="margin:10px 0 6px;">Request details (panel)</h4>
              <div class="actions">
                @if (!editingDetailId()) {
                  <button class="btn-secondary" type="button" (click)="startCreateDetail()">+ Request detail</button>
                }
              </div>
              @if (editingDetailId() || creatingDetailMode()) {
                <div class="editor" style="margin-top:8px;">
                  <h4>{{ editingDetailId() ? 'Request detail wijzigen' : 'Nieuw request detail' }}</h4>
                  <div class="grid">
                    <label class="field"><span>TVE</span><input [(ngModel)]="requestDetailForm.tve" name="rd_tve" /></label>
                    <label class="field"><span>Task Type</span><input [(ngModel)]="requestDetailForm.taskType" name="rd_task_type" /></label>
                    <label class="field"><span>FMS / Non-FMS</span><input [(ngModel)]="requestDetailForm.fmsOrNonFms" name="rd_fms_non_fms" /></label>
                    <label class="field"><span>Releasability</span><input [(ngModel)]="requestDetailForm.releasability" name="rd_releasability" /></label>
                    <label class="field"><span>Technical Product Number</span><input [(ngModel)]="requestDetailForm.technicalProductNumber" name="rd_tp_number" /></label>
                    <label class="field"><span>Technical Product Title</span><input [(ngModel)]="requestDetailForm.technicalProductTitle" name="rd_tp_title" /></label>
                    <label class="field"><span>Submitter Name</span><input [(ngModel)]="requestDetailForm.submitterName" name="rd_submitter_name" /></label>
                    <label class="field"><span>Location</span><input [(ngModel)]="requestDetailForm.location" name="rd_location" /></label>
                    <label class="field"><span>MDR Type</span><input [(ngModel)]="requestDetailForm.mdrType" name="rd_mdrtype" /></label>
                    <label class="field"><span>Part Number</span><input [(ngModel)]="requestDetailForm.partNumber" name="rd_part" /></label>
                    <label class="field"><span>Serial Number</span><input [(ngModel)]="requestDetailForm.serialNumber" name="rd_serial" /></label>
                    <label class="field"><span>Internal Reference Number</span><input [(ngModel)]="requestDetailForm.internalReferenceNumber" name="rd_internal_ref" /></label>
                    <label class="field"><span>CR/ECP</span><input [(ngModel)]="requestDetailForm.crEcp" name="rd_cr_ecp" /></label>
                    <label class="field"><span>Discrepancy Type</span>
                      <select [(ngModel)]="requestDetailForm.discrepancyType" name="rd_discrepancy_type">
                        <option [ngValue]="null">--</option>
                        @for (opt of discrepancyTypeOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    </label>
                    <label class="field"><span>Cause Code / Discrepant Work</span>
                      <select [(ngModel)]="requestDetailForm.causeCodeDiscrepantWork" name="rd_cause_code">
                        <option [ngValue]="null">--</option>
                        @for (opt of causeCodeOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    </label>
                    <label class="field"><span>Resubmit Reason</span><input [(ngModel)]="requestDetailForm.resubmitReason" name="rd_resubmit_reason" /></label>
                    <label class="field"><span>Defect Code</span><input [(ngModel)]="requestDetailForm.defectCode" name="rd_defect" /></label>
                    <label class="field"><span>Access Location</span><input [(ngModel)]="requestDetailForm.accessLocation" name="rd_access_location" /></label>
                    <label class="field"><span>Date Due To Field</span><input [(ngModel)]="requestDetailDateDueInput" name="rd_date_due" type="date" /></label>
                    <label class="field"><span>Discovered By</span>
                      <select [(ngModel)]="requestDetailForm.discoveredBy" name="rd_discovered_by">
                        <option [ngValue]="null">--</option>
                        @for (opt of discoveredByOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    </label>
                    <label class="field"><span>When Discovered</span>
                      <select [(ngModel)]="requestDetailForm.whenDiscovered" name="rd_when_discovered">
                        <option [ngValue]="null">--</option>
                        @for (opt of whenDiscoveredOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    </label>
                    <label class="field"><span>LCN</span>
                      <select [(ngModel)]="requestDetailForm.lcn" name="rd_lcn">
                        <option [ngValue]="null">--</option>
                        @for (opt of lcnOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                      </select>
                    </label>
                    <label class="field"><span>LCN Description</span><input [(ngModel)]="requestDetailForm.lcnDescription" name="rd_lcn_description" /></label>
                    <label class="field"><span>Inspection Criteria</span><input [(ngModel)]="requestDetailForm.inspectionCriteria" name="rd_inspection_criteria" /></label>
                    <label class="field"><span>MGI Required</span><input [(ngModel)]="requestDetailForm.mgiRequired" name="rd_mgi_required" /></label>
                    <label class="field"><span>MGI Number</span><input [(ngModel)]="requestDetailForm.mgiNumber" name="rd_mgi_number" /></label>
                    <label class="field"><span>Discovered During</span><input [(ngModel)]="requestDetailForm.discoveredDuring" name="rd_discovered_during" /></label>
                    <label class="field"><span>Date Discovered</span><input [(ngModel)]="requestDetailDateDiscoveredInput" name="rd_date_discovered" type="date" /></label>
                    <label class="field"><span>T/M/S</span><input [(ngModel)]="requestDetailForm.tms" name="rd_tms" /></label>
                    <label class="field"><span>Email</span><input [(ngModel)]="requestDetailForm.email" name="rd_email" /></label>
                    <label class="field"><span>Confirm Email</span><input [(ngModel)]="requestDetailForm.confirmEmail" name="rd_confirm_email" /></label>
                    <label class="field full"><span>Problem Statement</span><textarea [(ngModel)]="requestDetailForm.problemStatement" name="rd_problem"></textarea></label>
                    <label class="field full"><span>Technical Product Details Summary</span><textarea [(ngModel)]="requestDetailForm.technicalProductDetailsSummary" name="rd_tp_summary"></textarea></label>
                  </div>
                  <div class="actions">
                    <button class="btn-primary" type="button" (click)="saveRequestDetail()">Opslaan request detail</button>
                    <button class="btn-secondary" type="button" (click)="resetRequestDetailForm()">Annuleren</button>
                  </div>
                </div>
              }
              @if (requestDetails().length === 0) { <p class="state">Geen request details gevonden.</p> } @else {
                @for (d of requestDetails(); track d.id) {
                  <p style="margin:4px 0;">
                    {{ d.tve ?? '-' }} · {{ d.partNumber ?? '-' }} · {{ d.problemStatement ?? '-' }}
                    <button class="btn-secondary inline" (click)="startEditDetail(d)">Wijzigen</button>
                    <button class="btn-danger inline" (click)="deleteRequestDetail(d.id)">Verwijder</button>
                  </p>
                }
              }
            </section>
          }

          <div class="table-wrap" style="margin-top:14px;">
            <table>
              <thead>
                <tr><th>ID</th><th>MDR Number</th><th>Subject</th><th>Status</th><th>Acties</th></tr>
              </thead>
              <tbody>
                @for (m of mdrCases(); track m.id) {
                  <tr>
                    <td>#{{ m.id }}</td>
                    <td>{{ m.mdrNumber ?? '-' }}</td>
                    <td>{{ m.subject ?? '-' }}</td>
                    <td>{{ m.status ?? '-' }}</td>
                    <td>
                      <button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button>
                      <button class="btn-secondary inline" (click)="selectCase(m)">Detail</button>
                      <button class="btn-danger inline" (click)="deleteMdr(m.id)">Verwijder</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    .page{max-width:1150px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .filters{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:10px;margin:10px 0}
    .field{display:grid;gap:6px;font-weight:600;color:#334155} input,select,textarea{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    textarea{min-height:84px;resize:vertical}
    .editor{margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.field.full{grid-column:1/-1}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    .btn-primary,.btn-secondary,.btn-danger{border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}.btn-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .inline{margin-right:6px;padding:6px 10px}
    .queue-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
    .queue-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc}
    .queue-card h3{margin:0 0 8px;font-size:1rem}
    .case-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #e5e7eb}
    .case-row:first-of-type{border-top:0}
    .row-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
    .table-wrap{margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;overflow:auto} table{width:100%;border-collapse:collapse} th,td{padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:left}
    .state{color:#64748b}
    @media(max-width:900px){.queue-grid{grid-template-columns:1fr}}
    @media(max-width:760px){.filters,.grid{grid-template-columns:1fr}}
  `,
})
export class MdrManagementPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

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

  private readonly transitions: Record<string, string[]> = {
    Draft: ['Awaiting Request', 'Request'],
    'Awaiting Request': ['Request', 'Closed'],
    Request: ['Submit', 'Resubmit', 'Closed'],
    Submit: ['In Review', 'Resubmit', 'Closed'],
    Resubmit: ['Submit', 'In Review', 'Closed'],
    'In Review': ['Approved', 'Rejected', 'Resubmit', 'Closed'],
    Approved: ['Closed'],
    Rejected: ['Resubmit', 'Closed'],
    Closed: [],
  };

  protected readonly awaiting = computed(() => this.mdrCases().filter((x) => x.status === 'Awaiting Request'));
  protected readonly requestQ = computed(() => this.mdrCases().filter((x) => x.status === 'Request'));
  protected readonly submitQ = computed(() => this.mdrCases().filter((x) => x.status === 'Submit'));
  protected readonly resubmitQ = computed(() => this.mdrCases().filter((x) => x.status === 'Resubmit'));
  protected readonly inReviewQ = computed(() => this.mdrCases().filter((x) => x.status === 'In Review'));
  protected readonly statusOptions = computed(() => {
    const fromLookup = this.lookupStatusCodes().map((x) => x.statusCode).filter((x): x is string => !!x);
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
    this.resetForm();
    this.creatingMode.set(true);
  }

  startEdit(row: MdrCase): void {
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
    this.resetRequestDetailForm();
    this.creatingDetailMode.set(true);
  }

  startEditDetail(row: MdrRequestDetail): void {
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
    if (!confirm('Request detail verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrRequestDetail(id));
    const panelId = this.selectedPanelId();
    if (panelId) {
      this.requestDetails.set(await firstValueFrom(this.svc.listMdrRequestDetails(panelId)));
    }
  }

  nextStatuses(status: string | null): string[] {
    return this.transitions[status ?? 'Draft'] ?? [];
  }

  caseLabel(m: MdrCase): string {
    return `#${m.id} ${m.mdrNumber ?? '(zonder nummer)'} — ${m.subject ?? '(zonder subject)'}`;
  }

  async deleteMdr(id: number): Promise<void> {
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
}
