import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Aircraft, InstallationTrackerRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type InstallationQueue = 'all' | 'ready_for_installation' | 'finished_installation';

@Component({
  selector: 'app-installation-trackers-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Installatie Trackers</h2>
        <p class="subtitle">Ready for installation en finished installation overzicht.</p>

        <div class="filters">
          <label class="field"><span>Aircraft</span><select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">@for (a of aircraft(); track a.id) {<option [ngValue]="a.id">{{ a.an }}</option>}</select></label>
          <label class="field"><span>Panel</span><select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)"><option [ngValue]="null">Alle panels</option>@for (p of panels(); track p.id) {<option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>}</select></label>
          <label class="field grow"><span>Zoeken</span><input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel, AN" /></label>
        </div>

        <div class="queue-tabs">
          <button [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles ({{ allRows().length }})</button>
          <button [class.active]="queue() === 'ready_for_installation'" (click)="setQueue('ready_for_installation')">Ready ({{ readyCount() }})</button>
          <button [class.active]="queue() === 'finished_installation'" (click)="setQueue('finished_installation')">Finished ({{ finishedCount() }})</button>
        </div>

        @if (loading()) { <p class="state">Laden...</p> }
        @else if (rows().length === 0) { <p class="state">Geen resultaten.</p> }
        @else {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Aircraft</th><th>Panel</th><th>Hole</th><th>Queue</th><th>Ordered</th><th>Delivered</th><th>Pending</th><th></th></tr></thead>
              <tbody>
                @for (r of rows(); track r.holeId) {
                  <tr>
                    <td>{{ r.aircraftAn ?? '-' }}</td>
                    <td>{{ r.panelNumber }}</td>
                    <td>#{{ r.holeNumber }}</td>
                    <td>{{ queueLabel(r.queueStatus) }}</td>
                    <td>{{ r.orderedParts }}</td>
                    <td>{{ r.deliveredParts }}</td>
                    <td>{{ r.pendingParts }}</td>
                    <td><a [routerLink]="['/corrosion', r.holeId]" class="link">Open hole</a></td>
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
    .page{max-width:1180px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .filters{display:flex;gap:10px;flex-wrap:wrap}.field{display:grid;gap:6px;font-weight:600;color:#334155}.grow{flex:1;min-width:220px}
    input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .queue-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
    .queue-tabs button{border:1px solid #cbd5e1;background:#f8fafc;padding:6px 10px;border-radius:999px;font-weight:700;cursor:pointer}
    .queue-tabs button.active{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
    .table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto}
    table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #eef2f7;text-align:left;white-space:nowrap}
    .state{color:#64748b}.link{text-decoration:none;color:#2563eb;font-weight:700}
  `,
})
export class InstallationTrackersPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<InstallationTrackerRow[]>([]);
  protected readonly allRows = signal<InstallationTrackerRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<InstallationQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);

  protected readonly readyCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'ready_for_installation').length);
  protected readonly finishedCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'finished_installation').length);

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

  async setQueue(queue: InstallationQueue): Promise<void> {
    this.queue.set(queue);
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    const filters = { aircraftId: this.selectedAircraftId(), panelId: this.selectedPanelId(), q: this.search().trim() || null };
    const [allRows, rows] = await Promise.all([
      firstValueFrom(this.svc.listInstallationTrackers({ ...filters, queue: 'all' })),
      firstValueFrom(this.svc.listInstallationTrackers({ ...filters, queue: this.queue() })),
    ]);
    this.allRows.set(allRows);
    this.rows.set(rows);
    this.loading.set(false);
  }

  queueLabel(queue: InstallationTrackerRow['queueStatus']): string {
    return queue === 'finished_installation' ? 'Finished installation' : 'Ready for installation';
  }
}
