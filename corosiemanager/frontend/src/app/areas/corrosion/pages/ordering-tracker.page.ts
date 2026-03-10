import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, OrderingTrackerRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type QueueFilter = 'all' | 'ordering_overview' | 'order_needed' | 'order_status' | 'delivery_status' | 'created_holes';

@Component({
  selector: 'app-ordering-tracker-page',
  imports: [FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Supply"
            title="Ordering tracker"
            subtitle="Volg bestellingen, leveringen en created holes zonder van scherm te wisselen."
          />

          <section class="ui-filter-grid">
            <article class="ui-filter-card">
              <p class="ui-filter-label">Context</p>
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

            <article class="ui-filter-card">
              <p class="ui-filter-label">Zoeken</p>
              <label class="ui-field">
                <span>Filter op hole, panel, aircraft of status</span>
                <input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel, AN of status" />
              </label>
            </article>
          </section>

          <section class="ui-queue-bar">
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles <span>{{ queueCounts().all }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'ordering_overview'" (click)="setQueue('ordering_overview')">Overview <span>{{ queueCounts().ordering_overview }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'order_needed'" (click)="setQueue('order_needed')">Order needed <span>{{ queueCounts().order_needed }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'order_status'" (click)="setQueue('order_status')">Order status <span>{{ queueCounts().order_status }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'delivery_status'" (click)="setQueue('delivery_status')">Delivery status <span>{{ queueCounts().delivery_status }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'created_holes'" (click)="setQueue('created_holes')">Created holes <span>{{ queueCounts().created_holes }}</span></button>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              @if (loading()) {
                <div class="ui-banner info"><span>Ordering tracker laden...</span></div>
              } @else if (loadError()) {
                <div class="ui-banner error">
                  <span>{{ loadError() }}</span>
                  <button class="ui-btn-secondary" type="button" (click)="reload()">Opnieuw proberen</button>
                </div>
              } @else if (rows().length === 0) {
                <app-empty-state
                  eyebrow="Geen resultaten"
                  title="Geen ordering-items gevonden"
                  description="Pas je filters aan of kies een andere queue om resultaten te tonen."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table">
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
                        <th>Actie</th>
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
                          <td><app-status-pill [label]="statusLabel(row)" [state]="statusTone(row)" /></td>
                          <td><a [routerLink]="['/corrosion', row.holeId]" class="ui-btn-ghost">Open hole</a></td>
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
})
export class OrderingTrackerPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<OrderingTrackerRow[]>([]);
  protected readonly allRows = signal<OrderingTrackerRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<QueueFilter>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
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
    this.loadError.set(null);
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };

    try {
      const [allRows, rows] = await Promise.all([
        firstValueFrom(this.svc.listOrderingTracker({ ...filters, queue: 'all' })),
        firstValueFrom(this.svc.listOrderingTracker({ ...filters, queue: this.queue() })),
      ]);

      this.allRows.set(allRows);
      this.rows.set(rows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Ordering tracker laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(row: OrderingTrackerRow): string {
    if (row.orderNeeded) return 'Order needed';
    if (row.deliveryInProgress) return 'Delivery in progress';
    if (row.orderInProgress) return 'Order in progress';
    if (row.installationReady) return 'Ready for installation';
    return 'Created';
  }

  statusTone(row: OrderingTrackerRow): string {
    if (row.installationReady) return 'finished';
    if (row.deliveryInProgress) return 'delivery_status';
    if (row.orderInProgress) return 'order_status';
    if (row.orderNeeded) return 'action_needed';
    return 'neutral';
  }
}
