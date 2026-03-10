import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { HoleListComponent } from '../components/hole-list.component';
import { Aircraft, Hole, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-list-page',
  imports: [HoleListComponent, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './corrosion-list.page.html',
  styleUrl: './corrosion-list.page.scss',
})
export class CorrosionListPage implements OnInit {
  private readonly corrosionService = inject(CorrosionService);
  private readonly routing = inject(RoutingService);
  private readonly route = inject(ActivatedRoute);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraftList = signal<Aircraft[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly holes = signal<Hole[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly search = signal<string>('');

  protected selectedAircraft = () => this.aircraftList().find((a) => a.id === this.selectedAircraftId()) ?? null;
  protected selectedPanel = () => this.panels().find((p) => p.id === this.selectedPanelId()) ?? null;
  protected readonly filteredHoles = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.holes();
    return this.holes().filter((h) => {
      return (
        String(h.holeNumber).includes(q) ||
        (h.inspectionStatus ?? '').toLowerCase().includes(q) ||
        (h.mdrCode ?? '').toLowerCase().includes(q)
      );
    });
  });

  protected get searchTerm(): string {
    return this.search();
  }

  protected set searchTerm(value: string) {
    this.search.set(value);
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const aircraft = await firstValueFrom(this.corrosionService.listAircraft());
      this.aircraftList.set(aircraft);
      const queryAircraftRaw = this.route.snapshot.queryParamMap.get('aircraftId');
      const queryPanelRaw = this.route.snapshot.queryParamMap.get('panelId');
      const queryAircraftId = queryAircraftRaw ? Number(queryAircraftRaw) : NaN;
      const queryPanelId = queryPanelRaw ? Number(queryPanelRaw) : NaN;
      const querySearch = this.route.snapshot.queryParamMap.get('q')?.trim() ?? '';

      const selectedAircraft = aircraft.find((a) => a.id === queryAircraftId) ?? aircraft[0] ?? null;
      if (!selectedAircraft) {
        this.loading.set(false);
        return;
      }

      this.selectedAircraftId.set(selectedAircraft.id);
      await this.loadPanels(selectedAircraft.id, Number.isFinite(queryPanelId) ? queryPanelId : null);
      this.search.set(querySearch);
    } catch (error) {
      const message = this.apiErrors.toUserMessage(error, 'Overzicht laden mislukt');
      this.loadError.set(message);
      this.toast.error(message);
      this.loading.set(false);
    }
  }

  async onAircraftChange(aircraftId: number): Promise<void> {
    this.selectedAircraftId.set(Number(aircraftId));
    try {
      await this.loadPanels(Number(aircraftId));
    } catch (error) {
      const message = this.apiErrors.toUserMessage(error, 'Panels laden mislukt');
      this.loadError.set(message);
      this.loading.set(false);
      this.toast.error(message);
    }
  }

  async onPanelChange(panelId: number): Promise<void> {
    this.selectedPanelId.set(Number(panelId));
    try {
      await this.loadHoles(Number(panelId));
    } catch (error) {
      const message = this.apiErrors.toUserMessage(error, 'Holes laden mislukt');
      this.loadError.set(message);
      this.loading.set(false);
      this.toast.error(message);
    }
  }

  private async loadPanels(aircraftId: number, preferredPanelId: number | null = null): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const panels = await firstValueFrom(this.corrosionService.listPanels(aircraftId));
    this.panels.set(panels);

    const preferred = panels.find((p) => p.id === preferredPanelId) ?? panels.find((p) => p.holeCount > 0) ?? panels[0] ?? null;
    if (preferred) {
      this.selectedPanelId.set(preferred.id);
      await this.loadHoles(preferred.id);
    } else {
      this.selectedPanelId.set(null);
      this.holes.set([]);
      this.loading.set(false);
    }
  }

  private async loadHoles(panelId: number): Promise<void> {
    this.loadError.set(null);
    const holes = await firstValueFrom(this.corrosionService.listPanelHoles(panelId));
    this.holes.set(holes);
    this.loading.set(false);
  }

  openHole(holeId: number): void {
    void this.routing.goToCorrosionDetail(holeId);
  }
}
