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
  templateUrl: './ordering-tracker.page.html',
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
