import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Aircraft, MdrCase, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-mdr-management-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>

      <section class="card">
        <header class="header">
          <div>
            <h2>MDR Management</h2>
            <p class="subtitle">Overzicht van MDR-cases per aircraft en panel.</p>
          </div>
        </header>

        <div class="filters">
          <label class="field">
            <span>Aircraft</span>
            <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
              @for (a of aircraft(); track a.id) {
                <option [ngValue]="a.id">{{ a.an }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Panel</span>
            <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
              @for (p of panels(); track p.id) {
                <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
              }
            </select>
          </label>
        </div>

        @if (loading()) {
          <p class="state">Laden...</p>
        } @else if (mdrCases().length === 0) {
          <p class="state">Geen MDR-cases gevonden voor deze selectie.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>MDR Number</th>
                  <th>Versie</th>
                  <th>Status</th>
                  <th>Submitted by</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                @for (m of mdrCases(); track m.id) {
                  <tr>
                    <td>#{{ m.id }}</td>
                    <td>{{ m.mdrNumber ?? '-' }}</td>
                    <td>{{ m.mdrVersion ?? '-' }}</td>
                    <td><span class="badge">{{ m.status ?? '-' }}</span></td>
                    <td>{{ m.submittedBy ?? '-' }}</td>
                    <td>
                      <button class="btn-danger" (click)="deleteMdr(m.id)">Verwijder</button>
                    </td>
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
    .page { max-width: 1050px; margin: 0 auto; padding: 24px; }
    .back { text-decoration: none; color: #334155; font-weight: 600; display: inline-block; margin-bottom: 10px; }
    .back:hover { text-decoration: underline; }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      background: #fff;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
    }

    .header h2 { margin: 0; color: #0f172a; }
    .subtitle { margin: 6px 0 0; color: #64748b; }

    .filters {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 260px));
      gap: 10px;
    }

    .field { display: grid; gap: 6px; font-weight: 600; color: #334155; }
    select {
      padding: 9px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #fff;
    }

    .state { margin: 14px 0 0; color: #475569; }

    .table-wrap {
      margin-top: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: auto;
    }

    table { width: 100%; border-collapse: collapse; }
    thead { background: #f8fafc; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align: left; }
    th { font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; color: #475569; }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: .82rem;
      font-weight: 600;
    }

    .btn-danger {
      border: 1px solid #fecaca;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 8px;
      padding: 6px 10px;
      font-weight: 700;
      cursor: pointer;
    }

    @media (max-width: 760px) {
      .filters { grid-template-columns: 1fr; }
    }
  `,
})
export class MdrManagementPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly mdrCases = signal<MdrCase[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly loading = signal<boolean>(true);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    }
    this.loading.set(false);
  }

  async onAircraftChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedAircraftId.set(Number(id));
    const panels = await firstValueFrom(this.svc.listPanels(Number(id)));
    this.panels.set(panels);
    const first = panels[0];
    if (first) {
      this.selectedPanelId.set(first.id);
      await this.onPanelChange(first.id);
    } else {
      this.mdrCases.set([]);
    }
    this.loading.set(false);
  }

  async onPanelChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedPanelId.set(Number(id));
    this.mdrCases.set(await firstValueFrom(this.svc.listMdrCases(Number(id))));
    this.loading.set(false);
  }

  async deleteMdr(id: number): Promise<void> {
    if (!confirm('MDR case verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrCase(id));
    const panelId = this.selectedPanelId();
    if (panelId) await this.onPanelChange(panelId);
  }
}
