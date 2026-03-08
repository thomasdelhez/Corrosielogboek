import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Aircraft, NdiQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type NdiQueue = 'all' | 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';

@Component({
  selector: 'app-ndi-reports-page',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Main Menu</a>
      <section class="card">
        <h2>NDI Dashboard</h2>
        <p class="subtitle">Check tracker, action needed, report needed en finished queues.</p>

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
              <option [ngValue]="null">Alle panels</option>
              @for (p of panels(); track p.id) {
                <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
              }
            </select>
          </label>

          <label class="field grow">
            <span>Zoeken</span>
            <input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel, AN of status" />
          </label>
        </div>

        <div class="queue-tabs">
          <button [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles ({{ allRows().length }})</button>
          <button [class.active]="queue() === 'check_tracker'" (click)="setQueue('check_tracker')">Check tracker ({{ checkCount() }})</button>
          <button [class.active]="queue() === 'action_needed'" (click)="setQueue('action_needed')">Action needed ({{ actionCount() }})</button>
          <button [class.active]="queue() === 'report_needed'" (click)="setQueue('report_needed')">Report needed ({{ reportCount() }})</button>
          <button [class.active]="queue() === 'finished'" (click)="setQueue('finished')">Finished ({{ finishedCount() }})</button>
        </div>

        <div class="queue-summary">
          <span>Check: {{ checkCount() }}</span>
          <span>Action: {{ actionCount() }}</span>
          <span>Report: {{ reportCount() }}</span>
          <span>Finished: {{ finishedCount() }}</span>
        </div>

        @if (message()) { <p class="msg">{{ message() }}</p> }

        @if (loading()) {
          <p class="state">Laden...</p>
        } @else if (rows().length === 0) {
          <p class="state">Geen resultaten.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aircraft</th><th>Panel</th><th>Hole</th><th>Queue</th><th>Inspection</th><th>Initials</th><th>Date</th><th>Method</th><th>Acties</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.holeId) {
                  <tr>
                    <td>{{ r.aircraftAn ?? '-' }}</td>
                    <td>{{ r.panelNumber }}</td>
                    <td>#{{ r.holeNumber }}</td>
                    <td><span class="pill">{{ queueLabel(r.queueStatus) }}</span></td>
                    <td>{{ r.inspectionStatus ?? '-' }}</td>
                    <td>{{ r.ndiNameInitials ?? '-' }}</td>
                    <td>{{ r.ndiInspectionDate ? (r.ndiInspectionDate | date:'yyyy-MM-dd') : '-' }}</td>
                    <td>{{ r.latestReportMethod ?? '-' }}</td>
                    <td class="actions">
                      @if (r.queueStatus === 'check_tracker') {
                        <button class="btn" (click)="transition(r.holeId, 'report_needed')">To report needed</button>
                      }
                      @if (r.queueStatus === 'action_needed') {
                        <button class="btn" (click)="transition(r.holeId, 'report_needed')">Action done</button>
                      }
                      @if (r.queueStatus !== 'finished') {
                        <button class="btn" (click)="quickAddReport(r.holeId, r.panelId)">+ Quick report</button>
                        <button class="btn" (click)="transition(r.holeId, 'finished')">Mark finished</button>
                      }
                      @if (r.queueStatus === 'finished') {
                        <button class="btn" (click)="transition(r.holeId, 'check_tracker')">Reopen</button>
                      }
                      <a [routerLink]="['/corrosion', r.holeId]" class="link">Open hole</a>
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
    .page{max-width:1200px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px}.subtitle{color:#64748b}
    .filters{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.field{display:grid;gap:6px;font-weight:600;color:#334155}.grow{flex:1;min-width:220px}
    input,select{padding:8px;border:1px solid #cbd5e1;border-radius:8px}
    .queue-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .queue-tabs button{border:1px solid #cbd5e1;background:#f8fafc;padding:6px 10px;border-radius:999px;font-weight:700;cursor:pointer}
    .queue-tabs button.active{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
    .queue-summary{display:flex;gap:14px;flex-wrap:wrap;font-weight:700;color:#334155;margin-bottom:8px}
    .table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto}
    table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #eef2f7;text-align:left;white-space:nowrap}
    .pill{display:inline-block;background:#e2e8f0;padding:2px 8px;border-radius:999px;font-size:.78rem;font-weight:700}
    .actions{display:flex;gap:6px;align-items:center}.btn{border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;padding:5px 8px;cursor:pointer}
    .link{text-decoration:none;color:#2563eb;font-weight:700}.state{color:#64748b}.msg{color:#15803d;font-weight:700}
  `,
})
export class NdiReportsPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<NdiQueueRow[]>([]);
  protected readonly allRows = signal<NdiQueueRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<NdiQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly message = signal<string>('');

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
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };

    const [allRows, rows] = await Promise.all([
      firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: 'all' })),
      firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: this.queue() })),
    ]);

    this.allRows.set(allRows);
    this.rows.set(rows);
    this.loading.set(false);
  }

  queueLabel(queue: NdiQueueRow['queueStatus']): string {
    if (queue === 'check_tracker') return 'Check tracker';
    if (queue === 'action_needed') return 'Action needed';
    if (queue === 'report_needed') return 'Report needed';
    return 'Finished';
  }

  async transition(holeId: number, toStatus: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished'): Promise<void> {
    try {
      await firstValueFrom(this.svc.transitionNdiStatus(holeId, toStatus));
      this.message.set(`NDI status bijgewerkt: ${this.queueLabel(toStatus)}`);
      await this.reload();
    } catch (e: any) {
      this.message.set(`NDI status update mislukt ${e?.error?.detail ?? ''}`.trim());
    }
  }

  async quickAddReport(holeId: number, panelId: number): Promise<void> {
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
      await this.reload();
    } catch (e: any) {
      this.message.set(`Quick report mislukt ${e?.error?.detail ?? ''}`.trim());
    }
  }
}
