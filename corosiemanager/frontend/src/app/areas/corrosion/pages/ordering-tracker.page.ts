import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Aircraft, OrderingTrackerRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type QueueFilter = 'all' | 'ordering_overview' | 'order_needed' | 'order_status' | 'delivery_status' | 'created_holes';

@Component({
  selector: 'app-ordering-tracker-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>

      <section class="card">
        <h2>Ordering Tracker</h2>
        <p class="subtitle">Order needed, order status, delivery status en created holes in één overzicht.</p>

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
          <button [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles <span class="count">{{ queueCounts().all }}</span></button>
          <button [class.active]="queue() === 'ordering_overview'" (click)="setQueue('ordering_overview')">Ordering overview <span class="count">{{ queueCounts().ordering_overview }}</span></button>
          <button [class.active]="queue() === 'order_needed'" (click)="setQueue('order_needed')">Order needed <span class="count">{{ queueCounts().order_needed }}</span></button>
          <button [class.active]="queue() === 'order_status'" (click)="setQueue('order_status')">Order status <span class="count">{{ queueCounts().order_status }}</span></button>
          <button [class.active]="queue() === 'delivery_status'" (click)="setQueue('delivery_status')">Delivery status <span class="count">{{ queueCounts().delivery_status }}</span></button>
          <button [class.active]="queue() === 'created_holes'" (click)="setQueue('created_holes')">Created holes <span class="count">{{ queueCounts().created_holes }}</span></button>
        </div>

        @if (loading()) {
          <p class="state">Laden...</p>
        } @else if (rows().length === 0) {
          <p class="state">Geen resultaten voor deze selectie.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aircraft</th>
                  <th>Panel</th>
                  <th>Hole</th>
                  <th>Inspection</th>
                  <th>Ordered</th>
                  <th>Delivered</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.holeId) {
                  <tr>
                    <td>{{ row.aircraftAn ?? '-' }}</td>
                    <td>{{ row.panelNumber }}</td>
                    <td>#{{ row.holeNumber }}</td>
                    <td>{{ row.inspectionStatus ?? '-' }}</td>
                    <td>{{ row.orderedParts }}</td>
                    <td>{{ row.deliveredParts }}</td>
                    <td>{{ row.pendingParts }}</td>
                    <td><span class="pill" [class.warn]="row.orderNeeded" [class.info]="row.orderInProgress" [class.ok]="row.installationReady">{{ statusLabel(row) }}</span></td>
                    <td><a [routerLink]="['/corrosion', row.holeId]" class="linkbtn">Open</a></td>
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
    .filters{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 12px}.field{display:grid;gap:6px;font-weight:600;color:#334155}.grow{flex:1;min-width:220px}
    input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px;min-width:180px}
    .queue-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .queue-tabs button{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:999px;padding:7px 12px;font-weight:700;cursor:pointer}
    .queue-tabs button.active{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
    .count{display:inline-block;margin-left:6px;background:#e2e8f0;color:#0f172a;border-radius:999px;padding:1px 7px;font-size:.75rem}
    .table-wrap{margin-top:6px;border:1px solid #e2e8f0;border-radius:12px;overflow:auto}
    table{width:100%;border-collapse:collapse} th,td{padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:left;white-space:nowrap}
    .state{color:#64748b}
    .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.78rem;font-weight:700;background:#e2e8f0;color:#334155}
    .pill.warn{background:#ffedd5;color:#9a3412}.pill.info{background:#dbeafe;color:#1d4ed8}.pill.ok{background:#dcfce7;color:#166534}
    .linkbtn{color:#2563eb;text-decoration:none;font-weight:700}
  `,
})
export class OrderingTrackerPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<OrderingTrackerRow[]>([]);
  protected readonly allRows = signal<OrderingTrackerRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<QueueFilter>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly queueCounts = computed(() => {
    const rows = this.allRows();
    const orderNeeded = rows.filter((r) => r.orderNeeded).length;
    const orderStatus = rows.filter((r) => r.orderInProgress).length;
    const deliveryStatus = rows.filter((r) => r.deliveryInProgress).length;
    const createdHoles = rows.filter((r) => !r.orderNeeded && !r.orderInProgress && !r.deliveryInProgress && !r.installationReady).length;

    return {
      all: rows.length,
      ordering_overview: rows.length,
      order_needed: orderNeeded,
      order_status: orderStatus,
      delivery_status: deliveryStatus,
      created_holes: createdHoles,
    };
  });

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

  async setQueue(queue: QueueFilter): Promise<void> {
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
      firstValueFrom(this.svc.listOrderingTracker({ ...filters, queue: 'all' })),
      firstValueFrom(this.svc.listOrderingTracker({ ...filters, queue: this.queue() })),
    ]);

    this.allRows.set(allRows);
    this.rows.set(rows);
    this.loading.set(false);
  }

  statusLabel(row: OrderingTrackerRow): string {
    if (row.orderNeeded) return 'Order needed';
    if (row.deliveryInProgress) return 'Delivery in progress';
    if (row.orderInProgress) return 'Order in progress';
    if (row.installationReady) return 'Ready for installation';
    return 'Created';
  }
}
