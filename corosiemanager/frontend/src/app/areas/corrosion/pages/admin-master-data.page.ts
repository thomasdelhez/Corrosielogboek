import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateHoleInput } from '../models/corrosion.inputs';
import { Aircraft, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-master-data-page',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Beheer"
            title="Aircraft beheer"
            subtitle="Beheer aircraft, panels en batch hole-creates in een opgeruimde administratieve flow."
            backLink="/"
            backLabel="Hoofdmenu"
          />

          @if (message()) {
            <div class="ui-banner" [class.error]="messageType() === 'error'" [class.info]="messageType() !== 'error'">
              <span>{{ message() }}</span>
            </div>
          }

          <section class="ui-filter-grid">
            <article class="ui-section">
              <div class="ui-section-inner ui-stack-md">
                <p class="ui-filter-label">Nieuw aircraft</p>
                <div class="ui-form-grid">
                  <label class="ui-field">
                    <span>AN</span>
                    <input [(ngModel)]="aircraftAn" />
                  </label>
                  <label class="ui-field">
                    <span>Serial number</span>
                    <input [(ngModel)]="aircraftSerial" />
                  </label>
                </div>
                <div class="ui-actions">
                  <button class="ui-btn" type="button" (click)="createAircraft()">Aircraft aanmaken</button>
                </div>
              </div>
            </article>

            <article class="ui-section">
              <div class="ui-section-inner ui-stack-md">
                <p class="ui-filter-label">Nieuw panel</p>
                <div class="ui-form-grid">
                  <label class="ui-field">
                    <span>Aircraft</span>
                    <select [(ngModel)]="panelAircraftId">
                      @for (a of aircraft(); track a.id) {
                        <option [ngValue]="a.id">{{ a.an }}</option>
                      }
                    </select>
                  </label>
                  <label class="ui-field">
                    <span>Panel number</span>
                    <input type="number" [(ngModel)]="panelNumber" />
                  </label>
                </div>
                <div class="ui-actions">
                  <button class="ui-btn" type="button" (click)="createPanel()">Panel aanmaken</button>
                </div>
              </div>
            </article>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              <app-page-header title="Batch hole create" subtitle="Voer ranges of CSV in, controleer de preview en maak holes in één submit aan." />

              <p class="ui-note">Voorbeeld: <code>101-120, 130, 145</code></p>

              <div class="ui-form-grid">
                <label class="ui-field">
                  <span>Aircraft</span>
                  <select [ngModel]="batchAircraftId()" (ngModelChange)="onBatchAircraftChange($event)">
                    @for (a of aircraft(); track a.id) {
                      <option [ngValue]="a.id">{{ a.an }}</option>
                    }
                  </select>
                </label>
                <label class="ui-field">
                  <span>Panel</span>
                  <select [ngModel]="batchPanelId()" (ngModelChange)="batchPanelId.set($event)">
                    @for (p of batchPanels(); track p.id) {
                      <option [ngValue]="p.id">Panel {{ p.panelNumber }} ({{ p.holeCount }})</option>
                    }
                  </select>
                </label>
                <label class="ui-field full">
                  <span>Hole nummers</span>
                  <textarea rows="4" [ngModel]="batchRawInput()" (ngModelChange)="onBatchRawInputChange($event)" placeholder="101-120, 130, 145"></textarea>
                </label>
              </div>

              <div class="ui-actions">
                <button class="ui-btn-secondary" type="button" (click)="previewBatch()">Preview</button>
                <button class="ui-btn" type="button" (click)="submitBatch()" [disabled]="batchSubmitting() || !batchPanelId() || !batchPreviewConfirmed() || batchPreviewNumbers().length === 0">
                  {{ batchSubmitting() ? 'Bezig...' : 'Batch aanmaken' }}
                </button>
              </div>

              @if (batchPreviewNumbers().length > 0) {
                <div class="ui-banner info">
                  <span>Preview: {{ batchPreviewNumbers().length }} holes → {{ batchPreviewNumbers().slice(0, 20).join(', ') }}@if (batchPreviewNumbers().length > 20) { ... }</span>
                </div>
              }

              @if (batchCreatedCount() + batchSkippedCount() + batchErrorCount() > 0) {
                <div class="ui-summary-row">
                  <span class="ui-chip">Created {{ batchCreatedCount() }}</span>
                  <span class="ui-chip">Skipped {{ batchSkippedCount() }}</span>
                  <span class="ui-chip">Errors {{ batchErrorCount() }}</span>
                </div>
              }
            </div>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              <app-page-header title="Overzicht" subtitle="Snel overzicht van aircraft en het aantal gekoppelde panels." />
              @if (aircraft().length === 0) {
                <app-empty-state
                  eyebrow="Geen masterdata"
                  title="Nog geen aircraft gevonden"
                  description="Maak eerst een aircraft aan om panels en batch-holes te beheren."
                />
              } @else {
                <div class="ui-detail-list">
                  @for (a of aircraft(); track a.id) {
                    <article class="ui-detail-item">
                      <strong>{{ a.an }}</strong>
                      @if (a.serialNumber) {
                        <span> ({{ a.serialNumber }})</span>
                      }
                      <p class="ui-note">Panels: {{ panelCountByAircraft(a.id) }}</p>
                    </article>
                  }
                </div>
              }
            </div>
          </section>
        </div>
      </section>
    </main>
  `,
})
export class AdminMasterDataPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly message = signal('');
  protected readonly messageType = signal<'success' | 'error' | 'info'>('info');
  protected readonly batchAircraftId = signal<number | null>(null);
  protected readonly batchPanelId = signal<number | null>(null);
  protected readonly batchRawInput = signal<string>('');
  protected readonly batchPreviewNumbers = signal<number[]>([]);
  protected readonly batchPreviewConfirmed = signal<boolean>(false);
  protected readonly batchSubmitting = signal<boolean>(false);
  protected readonly batchCreatedCount = signal<number>(0);
  protected readonly batchSkippedCount = signal<number>(0);
  protected readonly batchErrorCount = signal<number>(0);
  protected readonly batchPanels = computed(() => this.panels().filter((p) => p.aircraftId === this.batchAircraftId()));

  protected aircraftAn = '';
  protected aircraftSerial = '';
  protected panelAircraftId: number | null = null;
  protected panelNumber: number | null = null;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async createAircraft(): Promise<void> {
    try {
      await firstValueFrom(this.svc.createAircraft({ an: this.aircraftAn.trim(), serialNumber: this.aircraftSerial || null }));
      this.aircraftAn = '';
      this.aircraftSerial = '';
      this.message.set('Aircraft aangemaakt');
      this.messageType.set('success');
      this.toast.success('Aircraft aangemaakt');
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Aircraft aanmaken mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async createPanel(): Promise<void> {
    if (!this.panelAircraftId || this.panelNumber === null) {
      this.message.set('Selecteer aircraft en panel number');
      this.messageType.set('info');
      this.toast.info('Selecteer aircraft en panel number');
      return;
    }

    try {
      await firstValueFrom(this.svc.createPanel({ aircraftId: this.panelAircraftId, panelNumber: Number(this.panelNumber) }));
      this.panelNumber = null;
      this.message.set('Panel aangemaakt');
      this.messageType.set('success');
      this.toast.success('Panel aangemaakt');
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Panel aanmaken mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  panelCountByAircraft(aircraftId: number): number {
    return this.panels().filter((p) => p.aircraftId === aircraftId).length;
  }

  onBatchAircraftChange(aircraftId: number): void {
    this.batchAircraftId.set(Number(aircraftId));
    const firstPanel = this.panels().find((p) => p.aircraftId === Number(aircraftId));
    this.batchPanelId.set(firstPanel?.id ?? null);
    this.batchPreviewNumbers.set([]);
    this.batchPreviewConfirmed.set(false);
    this.batchCreatedCount.set(0);
    this.batchSkippedCount.set(0);
    this.batchErrorCount.set(0);
  }

  onBatchRawInputChange(value: string): void {
    this.batchRawInput.set(value);
    this.batchPreviewConfirmed.set(false);
    this.batchPreviewNumbers.set([]);
    this.batchCreatedCount.set(0);
    this.batchSkippedCount.set(0);
    this.batchErrorCount.set(0);
  }

  previewBatch(): void {
    this.batchPreviewConfirmed.set(false);
    try {
      this.batchPreviewNumbers.set(this.parseHoleNumbers(this.batchRawInput()));
      this.batchPreviewConfirmed.set(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kon invoer niet verwerken';
      this.batchPreviewNumbers.set([]);
      this.toast.error(msg);
    }
  }

  async submitBatch(): Promise<void> {
    const panelId = this.batchPanelId();
    if (!panelId) {
      this.toast.info('Selecteer eerst een panel.');
      return;
    }
    if (!this.batchPreviewConfirmed() || this.batchPreviewNumbers().length === 0) {
      this.toast.info('Klik eerst op Preview voordat je Batch aanmaken gebruikt.');
      return;
    }

    this.batchSubmitting.set(true);
    this.batchCreatedCount.set(0);
    this.batchSkippedCount.set(0);
    this.batchErrorCount.set(0);
    try {
      const payload: CreateHoleInput[] = this.batchPreviewNumbers().map((n) => ({
        holeNumber: n,
        maxBpDiameter: null,
        finalHoleSize: null,
        fit: null,
        mdrCode: null,
        mdrVersion: null,
        ndiNameInitials: null,
        ndiInspectionDate: null,
        ndiFinished: false,
        inspectionStatus: null,
        steps: [],
        parts: [],
      }));
      const result = await firstValueFrom(this.svc.createBatchHoles(panelId, payload));
      this.batchCreatedCount.set(result.created);
      this.batchSkippedCount.set(result.skipped);
      this.batchErrorCount.set(result.errors);
      this.toast.success(`Batch verwerkt: ${result.created} aangemaakt, ${result.skipped} overgeslagen, ${result.errors} fouten.`);
      await this.reload();
    } catch (e: unknown) {
      this.toast.error(this.apiErrors.toUserMessage(e, 'Batch aanmaken mislukt'));
    } finally {
      this.batchSubmitting.set(false);
    }
  }

  private async reload(): Promise<void> {
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    const panels = await firstValueFrom(this.svc.listPanels());
    this.panels.set(panels);
    if (!this.panelAircraftId && aircraft[0]) {
      this.panelAircraftId = aircraft[0].id;
    }
    if (!this.batchAircraftId() && aircraft[0]) {
      this.onBatchAircraftChange(aircraft[0].id);
    }
  }

  private parseHoleNumbers(raw: string): number[] {
    const parts = raw
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const values = new Set<number>();
    for (const part of parts) {
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-').map((v) => v.trim());
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0 || end < start) {
          throw new Error(`Ongeldige range: ${part}`);
        }
        for (let n = start; n <= end; n += 1) {
          values.add(n);
        }
      } else {
        const value = Number(part);
        if (!Number.isInteger(value) || value <= 0) {
          throw new Error(`Ongeldig hole nummer: ${part}`);
        }
        values.add(value);
      }
    }

    return Array.from(values).sort((a, b) => a - b);
  }
}
