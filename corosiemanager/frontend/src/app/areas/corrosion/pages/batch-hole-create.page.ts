import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateHoleInput, CreateHoleBatchResultRow } from '../models/corrosion.inputs';
import { Aircraft, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-batch-hole-create-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a class="back-link" routerLink="/">← Hoofdmenu</a>
      <section class="card">
        <h2>Batch Hole Create</h2>
        <p class="subtitle">Maak meerdere holes in één submit (bijv. <code>101-120, 130, 145</code>).</p>

        <div class="grid">
          <label class="field">
            <span>Aircraft</span>
            <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
              @for (aircraft of aircraftList(); track aircraft.id) {
                <option [ngValue]="aircraft.id">{{ aircraft.an }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Panel</span>
            <select [disabled]="panels().length === 0" [ngModel]="selectedPanelId()" (ngModelChange)="selectedPanelId.set($event)">
              @for (panel of panels(); track panel.id) {
                <option [ngValue]="panel.id">Panel {{ panel.panelNumber }} ({{ panel.holeCount }})</option>
              }
            </select>
          </label>
        </div>

        <label class="field" style="margin-top:10px;">
          <span>Hole nummers (ranges en/of CSV)</span>
          <textarea rows="4" [ngModel]="rawInput()" (ngModelChange)="onRawInputChange($event)" placeholder="101-120, 130, 145"></textarea>
        </label>

        <div class="actions">
          <button class="btn-secondary" type="button" (click)="preview()">Preview</button>
          <button class="btn-primary" type="button" (click)="submit()" [disabled]="submitting() || !previewConfirmed() || previewNumbers().length === 0">
            {{ submitting() ? 'Bezig...' : 'Batch aanmaken' }}
          </button>
        </div>

        @if (previewNumbers().length > 0) {
          <p class="preview">Preview: {{ previewNumbers().length }} holes → {{ previewNumbers().slice(0, 20).join(', ') }}@if (previewNumbers().length > 20) { ... }</p>
        }

        @if (resultRows().length > 0) {
          <h3>Resultaat</h3>
          <p class="summary">Created: {{ createdCount() }} · Skipped: {{ skippedCount() }} · Errors: {{ errorCount() }}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Hole #</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                @for (row of resultRows(); track row.holeNumber + '-' + row.status) {
                  <tr>
                    <td>{{ row.holeNumber }}</td>
                    <td><span class="status" [class.ok]="row.status === 'created'" [class.warn]="row.status === 'skipped'" [class.bad]="row.status === 'error'">{{ row.status }}</span></td>
                    <td>{{ row.detail ?? '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    .page{max-width:980px;margin:0 auto;padding:24px}
    .back-link{display:inline-block;margin-bottom:10px;color:#334155;text-decoration:none;font-weight:600}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px}
    h2{margin:0 0 6px 0}
    .subtitle{margin:0 0 12px 0;color:#64748b}
    .grid{display:grid;gap:10px;grid-template-columns:1fr 1fr}
    .field{display:grid;gap:6px;font-weight:600;color:#334155}
    input,select,textarea{border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;background:#fff}
    textarea{font-family:inherit}
    .actions{display:flex;gap:8px;margin-top:10px}
    .btn-primary{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px}
    .btn-secondary{background:#e2e8f0;border:0;border-radius:8px;padding:8px 12px}
    .error{color:#b91c1c;font-weight:600}
    .preview{color:#334155}
    .summary{font-weight:600;color:#0f172a}
    .table-wrap{overflow:auto}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
    .status{padding:2px 8px;border-radius:999px;font-size:.8rem;text-transform:uppercase}
    .status.ok{background:#dcfce7;color:#166534}
    .status.warn{background:#fef3c7;color:#92400e}
    .status.bad{background:#fee2e2;color:#991b1b}
    @media(max-width:900px){.grid{grid-template-columns:1fr}}
  `,
})
export class BatchHoleCreatePage implements OnInit {
  private readonly corrosionService = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraftList = signal<Aircraft[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly rawInput = signal<string>('');
  protected readonly previewNumbers = signal<number[]>([]);
  protected readonly previewConfirmed = signal<boolean>(false);
  protected readonly parseError = signal<string>('');
  protected readonly submitting = signal<boolean>(false);
  protected readonly resultRows = signal<CreateHoleBatchResultRow[]>([]);

  protected readonly createdCount = computed(() => this.resultRows().filter((r) => r.status === 'created').length);
  protected readonly skippedCount = computed(() => this.resultRows().filter((r) => r.status === 'skipped').length);
  protected readonly errorCount = computed(() => this.resultRows().filter((r) => r.status === 'error').length);

  async ngOnInit(): Promise<void> {
    const aircraft = await firstValueFrom(this.corrosionService.listAircraft());
    this.aircraftList.set(aircraft);
    const firstAircraft = aircraft[0] ?? null;
    if (!firstAircraft) return;
    this.selectedAircraftId.set(firstAircraft.id);
    await this.loadPanels(firstAircraft.id);
  }

  async onAircraftChange(aircraftId: number): Promise<void> {
    this.selectedAircraftId.set(Number(aircraftId));
    await this.loadPanels(Number(aircraftId));
  }

  onRawInputChange(value: string): void {
    this.rawInput.set(value);
    this.previewConfirmed.set(false);
    this.previewNumbers.set([]);
  }

  preview(): void {
    this.parseError.set('');
    this.previewConfirmed.set(false);
    try {
      this.previewNumbers.set(this.parseHoleNumbers(this.rawInput()));
      this.previewConfirmed.set(true);
    } catch (e) {
      this.previewNumbers.set([]);
      const msg = e instanceof Error ? e.message : 'Kon invoer niet verwerken';
      this.parseError.set(msg);
      this.toast.error(msg);
    }
  }

  async submit(): Promise<void> {
    const panelId = this.selectedPanelId();
    if (!panelId) {
      this.parseError.set('Selecteer eerst een panel.');
      this.toast.info('Selecteer eerst een panel.');
      return;
    }

    if (!this.previewConfirmed() || this.previewNumbers().length === 0) {
      this.parseError.set('Klik eerst op Preview voordat je Batch aanmaken gebruikt.');
      this.toast.info('Klik eerst op Preview voordat je Batch aanmaken gebruikt.');
      return;
    }

    this.submitting.set(true);
    this.resultRows.set([]);
    this.parseError.set('');
    try {
      const payload: CreateHoleInput[] = this.previewNumbers().map((n) => ({
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
      const result = await firstValueFrom(this.corrosionService.createBatchHoles(panelId, payload));
      this.resultRows.set(result.results);
      this.toast.success(`Batch verwerkt: ${result.created} aangemaakt, ${result.skipped} overgeslagen, ${result.errors} fouten.`);
    } catch (error) {
      const msg = this.toErrorMessage(error);
      this.parseError.set(msg);
      this.toast.error(msg);
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadPanels(aircraftId: number): Promise<void> {
    const panels = await firstValueFrom(this.corrosionService.listPanels(aircraftId));
    this.panels.set(panels);
    this.selectedPanelId.set(panels[0]?.id ?? null);
  }

  private toErrorMessage(error: unknown): string {
    return this.apiErrors.toUserMessage(error, 'Batch aanmaken mislukt');
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
