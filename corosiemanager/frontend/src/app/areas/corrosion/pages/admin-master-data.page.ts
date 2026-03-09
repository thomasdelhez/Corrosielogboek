import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-master-data-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Admin — Aircraft & Panel beheer</h2>
        <p class="subtitle">Aanmaken van aircraft en panels met uniqueness-checks.</p>

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
    .field{display:grid;gap:6px;margin-bottom:8px;font-weight:600;color:#334155}input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .btn-primary{border:0;border-radius:8px;padding:8px 12px;background:#2563eb;color:#fff;font-weight:700}
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
  }
}
