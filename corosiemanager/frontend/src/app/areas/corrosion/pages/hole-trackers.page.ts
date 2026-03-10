import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, HoleTrackerRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type TrackerQueue = 'all' | 'max_bp' | 'flexhone' | 'reaming_steps';

@Component({
  selector: 'app-hole-trackers-page',
  imports: [FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  templateUrl: './hole-trackers.page.html',
})
export class HoleTrackersPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<HoleTrackerRow[]>([]);
  protected readonly allRows = signal<HoleTrackerRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<TrackerQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly maxBpCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'max_bp').length);
  protected readonly flexhoneCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'flexhone').length);
  protected readonly reamingCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'reaming_steps').length);

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

  async setQueue(queue: TrackerQueue): Promise<void> {
    this.queue.set(queue);
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const filters = { aircraftId: this.selectedAircraftId(), panelId: this.selectedPanelId(), q: this.search().trim() || null };
    try {
      const [allRows, rows] = await Promise.all([
        firstValueFrom(this.svc.listHoleTrackers({ ...filters, queue: 'all' })),
        firstValueFrom(this.svc.listHoleTrackers({ ...filters, queue: this.queue() })),
      ]);
      this.allRows.set(allRows);
      this.rows.set(rows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Hole trackers laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  queueLabel(queue: HoleTrackerRow['queueStatus']): string {
    if (queue === 'flexhone') return 'Flexhone';
    if (queue === 'reaming_steps') return 'Reaming steps';
    return 'MaxBP';
  }
}
