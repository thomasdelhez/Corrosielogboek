import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, InspectionQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type InspectionQueue = 'all' | 'to_be_inspected' | 'marked_as_corroded' | 'marked_as_rifled' | 'marked_as_clean';

@Component({
  selector: 'app-inspection-queues-page',
  imports: [FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  templateUrl: './inspection-queues.page.html',
})
export class InspectionQueuesPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<InspectionQueueRow[]>([]);
  protected readonly allRows = signal<InspectionQueueRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<InspectionQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly toInspectCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'to_be_inspected').length);
  protected readonly corrodedCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'marked_as_corroded').length);
  protected readonly rifledCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'marked_as_rifled').length);
  protected readonly cleanCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'marked_as_clean').length);

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

  async setQueue(queue: InspectionQueue): Promise<void> {
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
        firstValueFrom(this.svc.listInspectionDashboard({ ...filters, queue: 'all' })),
        firstValueFrom(this.svc.listInspectionDashboard({ ...filters, queue: this.queue() })),
      ]);

      this.allRows.set(allRows);
      this.rows.set(rows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Inspectie queues laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  queueLabel(queue: InspectionQueueRow['queueStatus']): string {
    if (queue === 'marked_as_corroded') return 'Marked as corroded';
    if (queue === 'marked_as_rifled') return 'Marked as rifled';
    if (queue === 'marked_as_clean') return 'Marked as clean';
    return 'To be inspected';
  }
}
