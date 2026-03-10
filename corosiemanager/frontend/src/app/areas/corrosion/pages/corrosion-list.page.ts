import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { HoleListComponent } from '../components/hole-list.component';
import { Aircraft, Hole, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-list-page',
  imports: [HoleListComponent, FormsModule, RouterLink],
  template: `
    <main class="page">
      <a class="back-link" routerLink="/">← Hoofdmenu</a>
      <section class="card">
        <header class="header">
          <div class="header-copy">
            <h2>Corrosie overzicht</h2>
            <p class="subtitle">
              @if (selectedAircraft()) {
                {{ selectedAircraft()!.an }}
              } @else {
                Selecteer eerst een aircraft
              }
              @if (selectedPanel()) {
                · Panel {{ selectedPanel()!.panelNumber }}
              }
            </p>
          </div>
        </header>

        <section class="control-strip">
          <label class="panel-picker">
            <span>Aircraft</span>
            <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
              @for (aircraft of aircraftList(); track aircraft.id) {
                <option [ngValue]="aircraft.id">{{ aircraft.an }}{{ aircraft.serialNumber ? ' (' + aircraft.serialNumber + ')' : '' }}</option>
              }
            </select>
          </label>

          <label class="panel-picker">
            <span>Panel</span>
            <select [disabled]="panels().length === 0" [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
              @for (panel of panels(); track panel.id) {
                <option [ngValue]="panel.id">Panel {{ panel.panelNumber }} ({{ panel.holeCount }})</option>
              }
            </select>
          </label>
        </section>

        @if (loading()) {
          <p class="loading">Laden...</p>
        } @else if (loadError()) {
          <div class="error-box">
            <p>{{ loadError() }}</p>
            <button class="btn-soft" type="button" (click)="reload()">Opnieuw proberen</button>
          </div>
        } @else if (holes().length === 0) {
          <p class="empty">Nog geen holes gevonden voor dit panel.</p>
        } @else {
          <div class="filter-bar">
            <label class="search-box">
              <span>Zoeken</span>
              <input
                type="text"
                placeholder="Zoek op hole/status/MDR..."
                [ngModel]="search()"
                (ngModelChange)="search.set($event)"
              />
            </label>
            <div class="filter-meta">
              <span class="count-pill">{{ filteredHoles().length }} van {{ holes().length }}</span>
              @if (search().trim()) {
                <button class="btn-soft" type="button" (click)="search.set('')">Wissen</button>
              }
            </div>
          </div>
          <app-hole-list [holes]="filteredHoles()" (open)="openHole($event)" />
        }
      </section>
    </main>
  `,
  styles: `
    .page { max-width: 1040px; margin: 0 auto; padding: 24px; }
    .card { background: #fff; border: 1px solid #dbeafe; border-radius: 16px; box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08); padding: 22px; }
    .header { margin-bottom: 10px; display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .header-copy { display:grid; gap:6px; }
    .back-link { display:inline-block; margin-bottom:10px; color:#334155; text-decoration:none; font-weight:600; }
    .back-link:hover { text-decoration:underline; }
    h2 { margin: 0; font-size: 1.4rem; color: #0f172a; }
    .subtitle { margin: 6px 0 0; color: #64748b; }
    .control-strip{
      margin:0 0 14px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;
    }
    .panel-picker { display: grid; gap: 6px; color: #334155; font-weight: 600; }
    .panel-picker select { width:100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; }
    .panel-picker select:disabled{opacity:.6;background:#f1f5f9}
    .filter-bar{
      margin: 4px 0 12px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;
      display:flex;justify-content:space-between;gap:10px;align-items:end;flex-wrap:wrap;
    }
    .search-box{display:grid;gap:6px;font-weight:600;color:#334155}
    .search-box input{width:100%;min-width:260px;max-width:420px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;background:#fff}
    .filter-meta{display:flex;gap:8px;align-items:center}
    .count-pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-weight:700;font-size:.82rem}
    .btn-soft{
      border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;
    }
    .loading, .empty { margin: 0; color: #475569; padding: 10px 0; }
    .error-box{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;border-radius:12px}
    @media (max-width: 760px){
      .control-strip{grid-template-columns:1fr}
      .search-box input{min-width:220px}
    }
  `,
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
