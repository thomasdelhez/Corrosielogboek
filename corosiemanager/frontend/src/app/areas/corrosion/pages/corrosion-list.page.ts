import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { HoleListComponent } from '../components/hole-list.component';
import { Aircraft, Hole, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-list-page',
  imports: [HoleListComponent, FormsModule],
  template: `
    <main class="page">
      <section class="card">
        <header class="header">
          <div>
            <p class="eyebrow">Corrosiemanager</p>
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

          <div style="display:grid;gap:8px;">
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
              <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
                @for (panel of panels(); track panel.id) {
                  <option [ngValue]="panel.id">Panel {{ panel.panelNumber }} ({{ panel.holeCount }})</option>
                }
              </select>
            </label>
          </div>
        </header>

        @if (loading()) {
          <p class="loading">Laden...</p>
        } @else if (holes().length === 0) {
          <p class="empty">Nog geen holes gevonden voor dit panel.</p>
        } @else {
          <div style="margin-bottom:10px;">
            <input
              type="text"
              placeholder="Zoek op hole/status/MDR..."
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              style="width:100%;max-width:380px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;"
            />
          </div>
          <app-hole-list [holes]="filteredHoles()" (open)="openHole($event)" />
        }
      </section>
    </main>
  `,
  styles: `
    .page { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); padding: 20px; }
    .header { margin-bottom: 16px; display: flex; justify-content: space-between; gap: 12px; align-items: end; flex-wrap: wrap; }
    .eyebrow { margin: 0 0 6px; color: #2563eb; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    h2 { margin: 0; font-size: 1.4rem; color: #0f172a; }
    .subtitle { margin: 6px 0 0; color: #64748b; }
    .panel-picker { display: grid; gap: 6px; color: #334155; font-weight: 600; }
    .panel-picker select { min-width: 290px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; }
    .loading, .empty { margin: 0; color: #475569; padding: 10px 0; }
  `,
})
export class CorrosionListPage implements OnInit {
  private readonly corrosionService = inject(CorrosionService);
  private readonly routing = inject(RoutingService);

  protected readonly aircraftList = signal<Aircraft[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly holes = signal<Hole[]>([]);
  protected readonly loading = signal<boolean>(true);
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
    this.loading.set(true);

    const aircraft = await firstValueFrom(this.corrosionService.listAircraft());
    this.aircraftList.set(aircraft);

    const firstAircraft = aircraft[0] ?? null;
    if (!firstAircraft) {
      this.loading.set(false);
      return;
    }

    this.selectedAircraftId.set(firstAircraft.id);
    await this.loadPanels(firstAircraft.id);
  }

  async onAircraftChange(aircraftId: number): Promise<void> {
    this.selectedAircraftId.set(Number(aircraftId));
    await this.loadPanels(Number(aircraftId));
  }

  async onPanelChange(panelId: number): Promise<void> {
    this.selectedPanelId.set(Number(panelId));
    await this.loadHoles(Number(panelId));
  }

  private async loadPanels(aircraftId: number): Promise<void> {
    this.loading.set(true);
    const panels = await firstValueFrom(this.corrosionService.listPanels(aircraftId));
    this.panels.set(panels);

    const preferred = panels.find((p) => p.holeCount > 0) ?? panels[0] ?? null;
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
    const holes = await firstValueFrom(this.corrosionService.listPanelHoles(panelId));
    this.holes.set(holes);
    this.loading.set(false);
  }

  openHole(holeId: number): void {
    void this.routing.goToCorrosionDetail(holeId);
  }
}
