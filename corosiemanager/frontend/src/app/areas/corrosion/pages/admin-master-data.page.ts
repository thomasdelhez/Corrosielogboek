import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateHoleInput } from '../models/corrosion.inputs';
import { Aircraft, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-master-data-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Aircraft beheer</h2>
        <p class="subtitle">Beheer aircraft, panels en batch hole create op één centrale pagina.</p>

        <div class="grid">
          <section class="subcard">
            <h3>Nieuw Aircraft</h3>
            <label class="field"><span>AN</span><input [(ngModel)]="aircraftAn" /></label>
            <label class="field"><span>Serial number</span><input [(ngModel)]="aircraftSerial" /></label>
            <button class="btn-primary" (click)="createAircraft()">Aanmaken</button>
          </section>

          <section class="subcard">
            <h3>Nieuw Panel</h3>
            <label class="field"><span>Aircraft</span>
              <select [(ngModel)]="panelAircraftId">
                @for (a of aircraft(); track a.id) {
                  <option [ngValue]="a.id">{{ a.an }}</option>
                }
              </select>
            </label>
            <label class="field"><span>Panel number</span><input type="number" [(ngModel)]="panelNumber" /></label>
            <button class="btn-primary" (click)="createPanel()">Aanmaken</button>
          </section>
        </div>

        <section class="subcard" style="margin-top:12px;">
          <h3>Batch Hole Create</h3>
          <p class="subtitle">Maak meerdere holes in één submit (bijv. <code>101-120, 130, 145</code>).</p>
          <div class="grid">
            <label class="field">
              <span>Aircraft</span>
              <select [ngModel]="batchAircraftId()" (ngModelChange)="onBatchAircraftChange($event)">
                @for (a of aircraft(); track a.id) {
                  <option [ngValue]="a.id">{{ a.an }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Panel</span>
              <select [ngModel]="batchPanelId()" (ngModelChange)="batchPanelId.set($event)">
                @for (p of batchPanels(); track p.id) {
                  <option [ngValue]="p.id">Panel {{ p.panelNumber }} ({{ p.holeCount }})</option>
                }
              </select>
            </label>
          </div>
          <label class="field" style="margin-top:10px;">
            <span>Hole nummers (ranges en/of CSV)</span>
            <textarea rows="4" [ngModel]="batchRawInput()" (ngModelChange)="onBatchRawInputChange($event)" placeholder="101-120, 130, 145"></textarea>
          </label>
          <div class="actions-top">
            <button class="btn-secondary" type="button" (click)="previewBatch()">Preview</button>
            <button class="btn-primary" type="button" (click)="submitBatch()" [disabled]="batchSubmitting() || !batchPanelId() || !batchPreviewConfirmed() || batchPreviewNumbers().length === 0">
              {{ batchSubmitting() ? 'Bezig...' : 'Batch aanmaken' }}
            </button>
          </div>
          @if (batchPreviewNumbers().length > 0) {
            <p class="subtitle">Preview: {{ batchPreviewNumbers().length }} holes → {{ batchPreviewNumbers().slice(0, 20).join(', ') }}@if (batchPreviewNumbers().length > 20) { ... }</p>
          }
          @if (batchCreatedCount() + batchSkippedCount() + batchErrorCount() > 0) {
            <p class="subtitle">Created: {{ batchCreatedCount() }} · Skipped: {{ batchSkippedCount() }} · Errors: {{ batchErrorCount() }}</p>
          }
        </section>

        <section class="subcard" style="margin-top:12px;">
          <h3>Overzicht</h3>
          <ul>
            @for (a of aircraft(); track a.id) {
              <li>
                <strong>{{ a.an }}</strong> {{ a.serialNumber ? '(' + a.serialNumber + ')' : '' }}
                <span style="color:#64748b;"> — panels: {{ panelCountByAircraft(a.id) }}</span>
              </li>
            }
          </ul>
        </section>
      </section>
    </main>
  `,
  styles: `
    .page{max-width:980px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.subcard{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
    .field{display:grid;gap:6px;margin-bottom:8px;font-weight:600;color:#334155}input,select,textarea{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .actions-top{margin:8px 0 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .btn-primary,.btn-secondary{border:0;border-radius:8px;padding:8px 12px;font-weight:700;text-decoration:none;display:inline-block}
    .btn-primary{background:#2563eb;color:#fff}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-secondary{background:#e2e8f0;color:#334155}
    .msg{color:#0f766e;font-weight:700}
    @media(max-width:820px){.grid{grid-template-columns:1fr}}
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

    const allPanels: PanelSummary[] = [];
    for (const a of aircraft) {
      const panels = await firstValueFrom(this.svc.listPanels(a.id));
      allPanels.push(...panels);
    }
    this.panels.set(allPanels);

    if (!this.panelAircraftId) {
      this.panelAircraftId = aircraft[0]?.id ?? null;
    }
    if (!this.batchAircraftId()) {
      this.batchAircraftId.set(aircraft[0]?.id ?? null);
    }
    if (!this.batchPanelId()) {
      const firstBatchPanel = allPanels.find((p) => p.aircraftId === this.batchAircraftId());
      this.batchPanelId.set(firstBatchPanel?.id ?? null);
    }
  }

  private parseHoleNumbers(value: string): number[] {
    const tokens = value
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) {
      throw new Error('Voer minimaal één hole nummer in.');
    }

    const out: number[] = [];
    for (const token of tokens) {
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (end < start) throw new Error(`Ongeldige range: ${token}`);
        for (let i = start; i <= end; i += 1) out.push(i);
        continue;
      }

      const single = Number(token);
      if (!Number.isInteger(single) || single < 0) {
        throw new Error(`Ongeldige waarde: ${token}`);
      }
      out.push(single);
    }

    return [...new Set(out)].sort((a, b) => a - b);
  }
}
