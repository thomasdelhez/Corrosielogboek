import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, NdiQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type NdiQueue = 'all' | 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';

@Component({
  selector: 'app-ndi-reports-page',
  imports: [FormsModule, RouterLink, DatePipe, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="NDI workflow"
            title="NDI dashboard"
            subtitle="Houd check tracker, action needed, report needed en finished holes in één overzicht onder controle."
          />

          <section class="filter-grid">
            <article class="filter-card">
              <p class="filter-label">Context</p>
              <div class="ui-grid two">
                <label class="ui-field">
                  <span>Aircraft</span>
                  <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
                    @for (a of aircraft(); track a.id) {
                      <option [ngValue]="a.id">{{ a.an }}</option>
                    }
                  </select>
                </label>

                <label class="ui-field">
                  <span>Panel</span>
                  <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
                    <option [ngValue]="null">Alle panels</option>
                    @for (p of panels(); track p.id) {
                      <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
                    }
                  </select>
                </label>
              </div>
            </article>

            <article class="filter-card">
              <p class="filter-label">Zoeken</p>
              <label class="ui-field">
                <span>Filter op hole, panel, aircraft of status</span>
                <input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel, AN of status" />
              </label>
            </article>
          </section>

          <section class="queue-bar">
            <button class="queue-chip" [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles <span>{{ allRows().length }}</span></button>
            <button class="queue-chip" [class.active]="queue() === 'check_tracker'" (click)="setQueue('check_tracker')">Check tracker <span>{{ checkCount() }}</span></button>
            <button class="queue-chip" [class.active]="queue() === 'action_needed'" (click)="setQueue('action_needed')">Action needed <span>{{ actionCount() }}</span></button>
            <button class="queue-chip" [class.active]="queue() === 'report_needed'" (click)="setQueue('report_needed')">Report needed <span>{{ reportCount() }}</span></button>
            <button class="queue-chip" [class.active]="queue() === 'finished'" (click)="setQueue('finished')">Finished <span>{{ finishedCount() }}</span></button>
          </section>

          <div class="summary-row">
            <span class="ui-chip">Check {{ checkCount() }}</span>
            <span class="ui-chip">Action {{ actionCount() }}</span>
            <span class="ui-chip">Report {{ reportCount() }}</span>
            <span class="ui-chip">Finished {{ finishedCount() }}</span>
          </div>

          @if (message()) {
            <div class="ui-banner" [class.error]="messageType() === 'error'" [class.info]="messageType() !== 'error'">
              <span>{{ message() }}</span>
            </div>
          }

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              @if (loading()) {
                <div class="ui-banner info"><span>NDI dashboard laden...</span></div>
              } @else if (loadError()) {
                <div class="ui-banner error">
                  <span>{{ loadError() }}</span>
                  <button class="ui-btn-secondary" type="button" (click)="reload()">Opnieuw proberen</button>
                </div>
              } @else if (rows().length === 0) {
                <app-empty-state
                  eyebrow="Geen resultaten"
                  title="Geen NDI-items gevonden"
                  description="Pas je filters aan of kies een andere queue om resultaten te tonen."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table ndi-table">
                    <thead>
                      <tr>
                        <th>Aircraft</th>
                        <th>Panel</th>
                        <th>Hole</th>
                        <th>Queue</th>
                        <th>Inspectie</th>
                        <th>Initials</th>
                        <th>Datum</th>
                        <th>Methode</th>
                        <th>Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of rows(); track r.holeId) {
                        <tr>
                          <td>{{ r.aircraftAn ?? '-' }}</td>
                          <td>{{ r.panelNumber }}</td>
                          <td>#{{ r.holeNumber }}</td>
                          <td><app-status-pill [label]="queueLabel(r.queueStatus)" [state]="r.queueStatus" /></td>
                          <td>{{ r.inspectionStatus ?? '-' }}</td>
                          <td>{{ r.ndiNameInitials ?? '-' }}</td>
                          <td>{{ r.ndiInspectionDate ? (r.ndiInspectionDate | date:'yyyy-MM-dd') : '-' }}</td>
                          <td>{{ r.latestReportMethod ?? '-' }}</td>
                          <td>
                            <div class="row-actions">
                              @if (r.queueStatus === 'check_tracker' && canTransitionNdi()) {
                                <button class="ui-btn-secondary" type="button" (click)="transition(r.holeId, 'report_needed')">To report needed</button>
                              }
                              @if (r.queueStatus === 'action_needed' && canTransitionNdi()) {
                                <button class="ui-btn-secondary" type="button" (click)="transition(r.holeId, 'report_needed')">Action done</button>
                              }
                              @if (r.queueStatus !== 'finished' && canCreateNdiReport()) {
                                <button class="ui-btn-secondary" type="button" (click)="quickAddReport(r.holeId, r.panelId)">Quick report</button>
                              }
                              @if (r.queueStatus !== 'finished' && canTransitionNdi()) {
                                <button class="ui-btn" type="button" (click)="transition(r.holeId, 'finished')">Mark finished</button>
                              }
                              @if (r.queueStatus === 'finished' && canTransitionNdi()) {
                                <button class="ui-btn-secondary" type="button" (click)="transition(r.holeId, 'check_tracker')">Reopen</button>
                              }
                              <a [routerLink]="['/corrosion', r.holeId]" class="ui-btn-ghost">Open hole</a>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        </div>
      </section>
    </main>
  `,
  styles: `
    .filter-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}
    .filter-card{
      padding:18px;border-radius:18px;border:1px solid var(--color-line);background:linear-gradient(180deg,#fff,#f6f9fc);box-shadow:var(--shadow-panel);
    }
    .filter-label{margin:0 0 10px;color:var(--color-brand);font-size:.76rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .queue-bar{display:flex;gap:10px;flex-wrap:wrap}
    .queue-chip{
      display:inline-flex;align-items:center;gap:10px;min-height:42px;padding:0 14px;border-radius:999px;border:1px solid var(--color-line);
      background:#fff;color:var(--color-ink);font-weight:700;cursor:pointer;
    }
    .queue-chip span{
      display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:var(--surface-subtle);font-size:.8rem;
    }
    .queue-chip.active{background:var(--color-brand-soft);border-color:rgba(21,94,239,.18);color:var(--color-brand)}
    .summary-row{display:flex;gap:10px;flex-wrap:wrap}
    .ndi-table td,.ndi-table th{white-space:nowrap}
    .row-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    @media (max-width:980px){.filter-grid{grid-template-columns:1fr}}
  `,
})
export class NdiReportsPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<NdiQueueRow[]>([]);
  protected readonly allRows = signal<NdiQueueRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<NdiQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly message = signal<string>('');
  protected readonly messageType = signal<'success' | 'error' | 'info'>('info');

  protected readonly checkCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'check_tracker').length);
  protected readonly actionCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'action_needed').length);
  protected readonly reportCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'report_needed').length);
  protected readonly finishedCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'finished').length);

  async ngOnInit(): Promise<void> {
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    } else {
      await this.reload();
    }
  }

  async onAircraftChange(id: number): Promise<void> {
    this.selectedAircraftId.set(Number(id));
    this.panels.set(await firstValueFrom(this.svc.listPanels(Number(id))));
    this.selectedPanelId.set(null);
    await this.reload();
  }

  async onPanelChange(id: number | null): Promise<void> {
    this.selectedPanelId.set(id === null ? null : Number(id));
    await this.reload();
  }

  async setQueue(queue: NdiQueue): Promise<void> {
    this.queue.set(queue);
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };
    try {
      const [allRows, rows] = await Promise.all([
        firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: 'all' })),
        firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: this.queue() })),
      ]);

      this.allRows.set(allRows);
      this.rows.set(rows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'NDI dashboard laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  queueLabel(queue: NdiQueueRow['queueStatus']): string {
    if (queue === 'check_tracker') return 'Check tracker';
    if (queue === 'action_needed') return 'Action needed';
    if (queue === 'report_needed') return 'Report needed';
    return 'Finished';
  }

  canTransitionNdi(): boolean {
    return this.permissions.canNdiTransition(this.auth.currentUser());
  }

  canCreateNdiReport(): boolean {
    return this.permissions.canNdiReportCreate(this.auth.currentUser());
  }

  async transition(holeId: number, toStatus: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished'): Promise<void> {
    if (!this.canTransitionNdi()) return;
    try {
      await firstValueFrom(this.svc.transitionNdiStatus(holeId, toStatus));
      this.message.set(`NDI status bijgewerkt: ${this.queueLabel(toStatus)}`);
      this.messageType.set('success');
      this.toast.success(`NDI status bijgewerkt: ${this.queueLabel(toStatus)}`);
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'NDI status update mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async quickAddReport(holeId: number, panelId: number): Promise<void> {
    if (!this.canCreateNdiReport()) return;
    try {
      await firstValueFrom(
        this.svc.createNdiReport(holeId, {
          panelId,
          nameInitials: 'TBD',
          inspectionDate: new Date(),
          method: 'VT',
          tools: null,
          corrosionPosition: null,
        }),
      );
      this.message.set('Quick NDI report toegevoegd (VT/TBD).');
      this.messageType.set('success');
      this.toast.success('Quick NDI report toegevoegd (VT/TBD).');
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Quick report mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }
}
