import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, CorrosionReportRow, MdrPowerpointInfoRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-report-page',
  imports: [FormsModule, DatePipe, PageHeaderComponent, EmptyStateComponent],
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Rapportage"
            title="Corrosion tracker report"
            subtitle="Filter, bekijk en exporteer corrosion- en MDR-overzichten vanuit één rapportagescherm."
          >
            <button class="ui-btn-secondary" type="button" (click)="exportCsv()">Export corrosion CSV</button>
            <button class="ui-btn-secondary" type="button" (click)="exportMdrCsv()">Export MDR PPT CSV</button>
          </app-page-header>

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
              <p class="ui-filter-label">Filteren</p>
              <div class="ui-grid two">
                <label class="ui-field">
                  <span>Status</span>
                  <select [ngModel]="inspectionStatus()" (ngModelChange)="inspectionStatus.set($event); reload()">
                    <option value="">Alle statussen</option>
                    @for (opt of inspectionStatusOptions; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                </label>
                <label class="ui-field">
                  <span>Zoeken</span>
                  <input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="Hole, panel of MDR" />
                </label>
              </div>
            </article>
          </section>

          <div class="ui-summary-row">
            <span class="ui-chip">Corrosion rows {{ rows().length }}</span>
            <span class="ui-chip">MDR PPT rows {{ mdrRows().length }}</span>
          </div>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              @if (loading()) {
                <div class="ui-banner info"><span>Rapportage laden...</span></div>
              } @else if (loadError()) {
                <div class="ui-banner error">
                  <span>{{ loadError() }}</span>
                  <button class="ui-btn-secondary" type="button" (click)="reload()">Opnieuw proberen</button>
                </div>
              } @else if (rows().length === 0) {
                <app-empty-state
                  eyebrow="Geen resultaten"
                  title="Geen rapportregels gevonden"
                  description="Pas de filters aan om corrosion-tracker data of MDR-exportinformatie te tonen."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table">
                    <thead>
                      <tr>
                        <th>Aircraft</th>
                        <th>Panel</th>
                        <th>Hole</th>
                        <th>Status</th>
                        <th>MDR</th>
                        <th>NDI</th>
                        <th>Final</th>
                        <th>MaxBP</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of rows(); track r.holeId) {
                        <tr>
                          <td>{{ r.aircraftAn ?? '-' }}</td>
                          <td>{{ r.panelNumber }}</td>
                          <td>#{{ r.holeNumber }}</td>
                          <td>{{ r.inspectionStatus ?? '-' }}</td>
                          <td>{{ r.mdrCode ?? '-' }} {{ r.mdrVersion ?? '' }}</td>
                          <td>{{ r.ndiFinished ? 'Yes' : 'No' }}</td>
                          <td>{{ r.finalHoleSize ?? '-' }}</td>
                          <td>{{ r.maxBpDiameter ?? '-' }}</td>
                          <td>{{ r.createdAt | date:'yyyy-MM-dd' }}</td>
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
export class CorrosionReportPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<CorrosionReportRow[]>([]);
  protected readonly mdrRows = signal<MdrPowerpointInfoRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly inspectionStatus = signal<string>('');
  protected readonly inspectionStatusOptions = ['Clean', 'Rifled', 'Open', 'In Progress', 'Closed'];
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);

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

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };

    try {
      const [corrosionRows, mdrRows] = await Promise.all([
        firstValueFrom(this.svc.listCorrosionReport({ ...filters, inspectionStatus: this.inspectionStatus().trim() || null })),
        firstValueFrom(this.svc.listMdrPowerpointInfo({ ...filters })),
      ]);

      this.rows.set(corrosionRows);
      this.mdrRows.set(mdrRows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Rapportage laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  exportCsv(): void {
    const header = ['aircraft','panel','hole','inspection_status','mdr_code','mdr_version','ndi_finished','final_hole_size','max_bp_diameter','created_at'];
    const lines = this.rows().map((r) => [
      r.aircraftAn ?? '',
      String(r.panelNumber),
      String(r.holeNumber),
      r.inspectionStatus ?? '',
      r.mdrCode ?? '',
      r.mdrVersion ?? '',
      r.ndiFinished ? 'true' : 'false',
      r.finalHoleSize === null ? '' : String(r.finalHoleSize),
      r.maxBpDiameter === null ? '' : String(r.maxBpDiameter),
      r.createdAt.toISOString(),
    ]);

    this.downloadCsv('corrosion-tracker-report.csv', [header, ...lines]);
    this.toast.success('Corrosion CSV geëxporteerd.');
  }

  exportMdrCsv(): void {
    const header = ['mdr_case_id','aircraft','panel','mdr_number','mdr_version','subject','status','submitted_by','request_date','need_date'];
    const lines = this.mdrRows().map((r) => [
      String(r.mdrCaseId),
      r.aircraftAn ?? '',
      r.panelNumber === null ? '' : String(r.panelNumber),
      r.mdrNumber ?? '',
      r.mdrVersion ?? '',
      r.subject ?? '',
      r.status ?? '',
      r.submittedBy ?? '',
      r.requestDate ? r.requestDate.toISOString() : '',
      r.needDate ? r.needDate.toISOString() : '',
    ]);

    this.downloadCsv('mdr-powerpoint-info.csv', [header, ...lines]);
    this.toast.success('MDR PPT CSV geëxporteerd.');
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
