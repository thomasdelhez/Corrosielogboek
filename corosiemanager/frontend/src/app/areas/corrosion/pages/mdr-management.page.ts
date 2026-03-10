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
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Review"
            title="MDR management"
            subtitle="Beheer cases, request details, statusovergangen en remarks vanuit één consistente reviewflow."
            backLink="/"
            backLabel="Hoofdmenu"
          />

          <section class="ui-filter-grid">
            <article class="ui-filter-card">
              <p class="ui-filter-label">Context</p>
              <div class="ui-grid two">
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
            </article>

            <article class="ui-filter-card">
              <p class="ui-filter-label">Acties</p>
              <div class="actions no-top">
                @if (!creatingMode() && !editingId() && canCreateOrEditMdr()) {
                  <button class="btn-primary" type="button" (click)="startCreate()">Nieuwe MDR case</button>
                }
                <span class="ui-chip">Cases {{ mdrCases().length }}</span>
                @if (selectedCase()) {
                  <span class="ui-chip brand">Actieve case #{{ selectedCase()!.id }}</span>
                }
              </div>
            </article>
          </section>

          @if (message()) {
            <div class="ui-banner" [class.error]="messageType() === 'error'" [class.info]="messageType() !== 'error'">
              <span>{{ message() }}</span>
            </div>
          }

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
              <button class="btn-primary" type="submit" [disabled]="mdrInlineErrors().length > 0">{{ editingId() ? 'Opslaan wijzigingen' : 'Aanmaken' }}</button>
              <button class="btn-secondary" type="button" (click)="resetForm()">Annuleren</button>
            </div>
            @if (mdrInlineErrors().length > 0) {
              <ul class="inline-errors">
                @for (err of mdrInlineErrors(); track err) {
                  <li>{{ err }}</li>
                }
              </ul>
            }
            </form>
          }

          @if (loading()) {
            <div class="ui-banner info"><span>MDR dashboard laden...</span></div>
          } @else {
            @if (selectedCase()) {
              <section class="queue-card">
              <h3>Case detail #{{ selectedCase()!.id }}</h3>
              <p><strong>MDR:</strong> {{ selectedCase()!.mdrNumber ?? '-' }} · <strong>Status:</strong> <app-status-pill [label]="selectedCase()!.status ?? '-'" [state]="selectedCase()!.status" /></p>
              <p><strong>Subject:</strong> {{ selectedCase()!.subject ?? '-' }}</p>

              <h4 style="margin:10px 0 6px;">Remarks</h4>
              @if (remarks().length === 0) { <app-empty-state eyebrow="Remarks" title="Nog geen remarks" description="Voeg een remark toe om opmerkingen en reviewcontext vast te leggen." /> } @else {
                @for (r of remarks(); track r.id) {
                  <p class="detail-row"><strong>V{{ r.remarkIndex }}:</strong> {{ r.remarkText }}</p>
                }
              }

              <div class="actions">
                <input class="remark-input" [(ngModel)]="remarkForm.remarkText" placeholder="Nieuwe remark" />
                <select [(ngModel)]="remarkForm.remarkIndex" class="remark-index">
                  @for (i of [1,2,3,4,5]; track i) { <option [ngValue]="i">V{{ i }}</option> }
                </select>
                @if (canCreateOrEditMdr()) {
                  <button class="btn-primary" type="button" (click)="addRemark()">Add remark</button>
                }
              </div>

              <h4 style="margin:10px 0 6px;">Request details (panel)</h4>
              <div class="actions">
                @if (!editingDetailId() && canManageRequestDetails()) {
                  <button class="btn-secondary" type="button" (click)="startCreateDetail()">+ Request detail</button>
                }
              </div>
              @if ((editingDetailId() || creatingDetailMode()) && canManageRequestDetails()) {
                <div class="editor nested-editor">
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
                    <button class="btn-primary" type="button" (click)="saveRequestDetail()" [disabled]="requestDetailInlineErrors().length > 0">Opslaan request detail</button>
                    <button class="btn-secondary" type="button" (click)="resetRequestDetailForm()">Annuleren</button>
                  </div>
                  @if (requestDetailInlineErrors().length > 0) {
                    <ul class="inline-errors">
                      @for (err of requestDetailInlineErrors(); track err) {
                        <li>{{ err }}</li>
                      }
                    </ul>
                  }
                </div>
              }
              @if (requestDetails().length === 0) { <app-empty-state eyebrow="Request details" title="Geen request details gevonden" description="Maak een request detail aan om panel-specifieke MDR-data vast te leggen." /> } @else {
                @for (d of requestDetails(); track d.id) {
                  <p class="detail-row">
                    {{ d.tve ?? '-' }} · {{ d.partNumber ?? '-' }} · {{ d.problemStatement ?? '-' }}
                    @if (canManageRequestDetails()) {
                      <button class="btn-secondary inline" (click)="startEditDetail(d)">Wijzigen</button>
                    }
                    @if (canDeleteRequestDetails()) {
                      <button class="btn-danger inline" (click)="deleteRequestDetail(d.id)">Verwijder</button>
                    }
                  </p>
                }
              }
              </section>
            }

            @if (mdrCases().length === 0) {
              <app-empty-state
                eyebrow="Geen cases"
                title="Nog geen MDR-cases voor dit panel"
                description="Maak een nieuwe MDR-case aan of kies een ander panel."
              />
            } @else {
              <div class="table-wrap">
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
                    <td><app-status-pill [label]="m.status ?? '-'" [state]="m.status" /></td>
                    <td>
                      @if (canCreateOrEditMdr()) {
                        <button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button>
                      }
                      <button class="btn-secondary inline" (click)="selectCase(m)">Detail</button>
                      @if (canDeleteMdr()) {
                        <button class="btn-danger inline" (click)="deleteMdr(m.id)">Verwijder</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
                </table>
              </div>
            }
          }
        </div>
      </section>
    </main>
  `,
  styles: `
    .field{display:grid;gap:7px;font-weight:600;color:var(--color-ink)}
    .field input,.field select,.field textarea{width:100%;border:1px solid var(--color-line-strong);border-radius:14px;padding:11px 13px;background:#fff;color:var(--color-ink-strong)}
    .field.full{grid-column:1/-1}
    textarea{min-height:84px;resize:vertical}
    .editor{padding:18px;border-radius:18px;border:1px solid var(--color-line);background:linear-gradient(180deg,#fff,#f6f9fc);box-shadow:var(--shadow-panel)}
    .nested-editor{margin-top:8px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    .actions.no-top{margin-top:0}
    .btn-primary,.btn-secondary,.btn-danger{
      display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 14px;border-radius:999px;border:1px solid transparent;font-weight:700;cursor:pointer
    }
    .btn-primary{background:var(--surface-brand);color:#fff;box-shadow:0 10px 24px rgba(21,94,239,.22)}
    .btn-secondary{background:var(--surface-subtle);color:var(--color-ink);border-color:var(--color-line)}
    .btn-danger{background:var(--color-danger-soft);color:var(--color-danger-ink);border-color:rgba(163,59,54,.18)}
    .inline{min-height:34px;padding:0 12px;margin-left:6px}
    .queue-card{padding:18px;border-radius:18px;border:1px solid var(--color-line);background:#fff;box-shadow:var(--shadow-panel)}
    .queue-card h3{margin:0 0 8px;font-size:1.05rem;color:var(--color-ink-strong)}
    .detail-row{margin:4px 0;color:var(--color-ink)}
    .remark-input{flex:1;min-width:260px}
    .remark-index{width:90px}
    .table-wrap{border:1px solid var(--color-line);border-radius:18px;overflow:auto;background:#fff}
    table{width:100%;border-collapse:collapse}
    th,td{padding:12px 14px;border-bottom:1px solid rgba(38,68,96,.08);text-align:left}
    th{background:#f5f8fb;color:var(--color-ink-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}
    .inline-errors{margin:10px 0 0;padding-left:18px;color:#b91c1c;display:grid;gap:4px}
    @media(max-width:760px){.grid{grid-template-columns:1fr}}
  `,
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
