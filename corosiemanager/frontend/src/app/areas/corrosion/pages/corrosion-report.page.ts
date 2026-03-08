import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Aircraft, CorrosionReportRow, MdrPowerpointInfoRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-report-page',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Corrosion Tracker Report</h2>
        <p class="subtitle">Rapportage-overzicht met export naar CSV.</p>

        <div class="filters">
          <label class="field"><span>Aircraft</span><select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">@for (a of aircraft(); track a.id) {<option [ngValue]="a.id">{{ a.an }}</option>}</select></label>
          <label class="field"><span>Panel</span><select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)"><option [ngValue]="null">Alle panels</option>@for (p of panels(); track p.id) {<option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>}</select></label>
          <label class="field"><span>Status</span><input [ngModel]="inspectionStatus()" (ngModelChange)="inspectionStatus.set($event); reload()" placeholder="bijv. Clean" /></label>
          <label class="field grow"><span>Zoeken</span><input [ngModel]="search()" (ngModelChange)="search.set($event); reload()" placeholder="hole/panel/MDR" /></label>
        </div>

        <div class="actions">
          <button class="btn-secondary" (click)="exportCsv()">Export Corrosion CSV</button>
          <button class="btn-secondary" (click)="exportMdrCsv()">Export MDR PPT CSV</button>
          <span class="count">{{ rows().length }} rijen</span>
        </div>

        @if (loading()) { <p class="state">Laden...</p> }
        @else if (rows().length === 0) { <p class="state">Geen resultaten.</p> }
        @else {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Aircraft</th><th>Panel</th><th>Hole</th><th>Status</th><th>MDR</th><th>NDI</th><th>Final</th><th>MaxBP</th><th>Created</th></tr></thead>
              <tbody>
                @for (r of rows(); track r.holeId) {
                  <tr>
                    <td>{{ r.aircraftAn ?? '-' }}</td><td>{{ r.panelNumber }}</td><td>#{{ r.holeNumber }}</td><td>{{ r.inspectionStatus ?? '-' }}</td>
                    <td>{{ r.mdrCode ?? '-' }} {{ r.mdrVersion ?? '' }}</td><td>{{ r.ndiFinished ? 'Yes' : 'No' }}</td><td>{{ r.finalHoleSize ?? '-' }}</td><td>{{ r.maxBpDiameter ?? '-' }}</td><td>{{ r.createdAt | date:'yyyy-MM-dd' }}</td>
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
    .page{max-width:1180px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .filters{display:flex;gap:10px;flex-wrap:wrap}.field{display:grid;gap:6px;font-weight:600;color:#334155}.grow{flex:1;min-width:220px}
    input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .actions{display:flex;gap:10px;align-items:center;margin:12px 0}.btn-secondary{border:0;border-radius:8px;padding:8px 12px;background:#e2e8f0;color:#334155;font-weight:700}
    .table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #eef2f7;text-align:left;white-space:nowrap}
    .state{color:#64748b}
  `,
})
export class CorrosionReportPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<CorrosionReportRow[]>([]);
  protected readonly mdrRows = signal<MdrPowerpointInfoRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly inspectionStatus = signal<string>('');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);

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
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };

    const [corrosionRows, mdrRows] = await Promise.all([
      firstValueFrom(this.svc.listCorrosionReport({ ...filters, inspectionStatus: this.inspectionStatus().trim() || null })),
      firstValueFrom(this.svc.listMdrPowerpointInfo({ ...filters })),
    ]);

    this.rows.set(corrosionRows);
    this.mdrRows.set(mdrRows);
    this.loading.set(false);
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
