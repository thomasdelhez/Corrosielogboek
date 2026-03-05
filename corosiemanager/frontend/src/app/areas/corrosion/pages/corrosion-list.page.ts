import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { HoleListComponent } from '../components/hole-list.component';
import { Hole, PanelSummary } from '../models/corrosion.models';
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
              @if (selectedPanel()) {
                Panel {{ selectedPanel()!.panelNumber }} · overzicht van geregistreerde holes
              } @else {
                Kies een panel om holes te bekijken
              }
            </p>
          </div>

          <label class="panel-picker">
            <span>Panel</span>
            <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
              @for (panel of panels(); track panel.id) {
                <option [ngValue]="panel.id">Panel {{ panel.panelNumber }} ({{ panel.holeCount }})</option>
              }
            </select>
          </label>
        </header>

        @if (loading()) {
          <p class="loading">Laden...</p>
        } @else if (holes().length === 0) {
          <p class="empty">Nog geen holes gevonden voor dit panel.</p>
        } @else {
          <app-hole-list [holes]="holes()" (open)="openHole($event)" />
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
    .panel-picker select { min-width: 230px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; }
    .loading, .empty { margin: 0; color: #475569; padding: 10px 0; }
  `,
})
export class CorrosionListPage implements OnInit {
  private readonly corrosionService = inject(CorrosionService);
  private readonly routing = inject(RoutingService);

  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly holes = signal<Hole[]>([]);
  protected readonly loading = signal<boolean>(true);

  protected selectedPanel = () => this.panels().find((p) => p.id === this.selectedPanelId()) ?? null;

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const panels = await firstValueFrom(this.corrosionService.listPanels());
    this.panels.set(panels);

    const preferred = panels.find((p) => p.holeCount > 0) ?? panels[0] ?? null;
    if (preferred) {
      this.selectedPanelId.set(preferred.id);
      await this.loadHoles(preferred.id);
    } else {
      this.holes.set([]);
      this.loading.set(false);
    }
  }

  async onPanelChange(panelId: number): Promise<void> {
    this.selectedPanelId.set(Number(panelId));
    await this.loadHoles(Number(panelId));
  }

  private async loadHoles(panelId: number): Promise<void> {
    this.loading.set(true);
    const holes = await firstValueFrom(this.corrosionService.listPanelHoles(panelId));
    this.holes.set(holes);
    this.loading.set(false);
  }

  openHole(holeId: number): void {
    void this.routing.goToCorrosionDetail(holeId);
  }
}
