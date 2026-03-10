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
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Queue control"
            title="Hole trackers"
            subtitle="Bekijk MaxBP, Flexhone en reaming steps in hetzelfde overzicht en open direct de juiste hole."
            backLink="/"
            backLabel="Hoofdmenu"
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
                <span>Filter op hole, panel of aircraft</span>
                <input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel of AN" />
              </label>
            </article>
          </section>

          <section class="ui-queue-bar">
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'all'" (click)="setQueue('all')">Alles <span>{{ allRows().length }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'max_bp'" (click)="setQueue('max_bp')">MaxBP <span>{{ maxBpCount() }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'flexhone'" (click)="setQueue('flexhone')">Flexhone <span>{{ flexhoneCount() }}</span></button>
            <button class="ui-queue-chip" type="button" [class.active]="queue() === 'reaming_steps'" (click)="setQueue('reaming_steps')">Reaming <span>{{ reamingCount() }}</span></button>
          </section>

          <div class="ui-summary-row">
            <span class="ui-chip">MaxBP {{ maxBpCount() }}</span>
            <span class="ui-chip">Flexhone {{ flexhoneCount() }}</span>
            <span class="ui-chip">Reaming {{ reamingCount() }}</span>
          </div>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              @if (loading()) {
                <div class="ui-banner info"><span>Hole trackers laden...</span></div>
              } @else if (loadError()) {
                <div class="ui-banner error">
                  <span>{{ loadError() }}</span>
                  <button class="ui-btn-secondary" type="button" (click)="reload()">Opnieuw proberen</button>
                </div>
              } @else if (rows().length === 0) {
                <app-empty-state
                  eyebrow="Geen resultaten"
                  title="Geen tracker-items gevonden"
                  description="Pas je filters aan of kies een andere tracker-queue om resultaten te tonen."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table">
                    <thead>
                      <tr>
                        <th>Aircraft</th>
                        <th>Panel</th>
                        <th>Hole</th>
                        <th>Queue</th>
                        <th>MaxBP</th>
                        <th>Max step</th>
                        <th>Reaming steps</th>
                        <th>Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of rows(); track r.holeId) {
                        <tr>
                          <td>{{ r.aircraftAn ?? '-' }}</td>
                          <td>{{ r.panelNumber }}</td>
                          <td>#{{ r.holeNumber }}</td>
                          <td><app-status-pill [label]="queueLabel(r.queueStatus)" [state]="r.queueStatus" /></td>
                          <td>{{ r.maxBpDiameter ?? '-' }}</td>
                          <td>{{ r.maxStepSize ?? '-' }}</td>
                          <td>{{ r.reamingStepCount }}</td>
                          <td><a [routerLink]="['/corrosion', r.holeId]" class="ui-btn-ghost">Open hole</a></td>
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
