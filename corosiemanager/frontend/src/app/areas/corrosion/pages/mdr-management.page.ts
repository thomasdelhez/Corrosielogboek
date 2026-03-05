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
      <a routerLink="/" class="back">← Main Menu</a>
      <section class="card">
        <h2>MDR Management</h2>

        <div class="row">
          <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
            @for (a of aircraft(); track a.id) {
              <option [ngValue]="a.id">{{ a.an }}</option>
            }
          </select>
          <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
            @for (p of panels(); track p.id) {
              <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
            }
          </select>
        </div>

        @for (m of mdrCases(); track m.id) {
          <p>#{{ m.id }} · {{ m.mdrNumber ?? '-' }} · {{ m.status ?? '-' }} <button (click)="deleteMdr(m.id)">Verwijder</button></p>
        }
      </section>
    </main>
  `,
  styles: `.page{max-width:900px;margin:0 auto;padding:24px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px}.row{display:flex;gap:8px;margin:10px 0}select{padding:8px;border:1px solid #cbd5e1;border-radius:8px}.back{text-decoration:none;color:#334155}`,
})
export class MdrManagementPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly mdrCases = signal<MdrCase[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    }
  }

  async onAircraftChange(id: number): Promise<void> {
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
  }

  async onPanelChange(id: number): Promise<void> {
    this.selectedPanelId.set(Number(id));
    this.mdrCases.set(await firstValueFrom(this.svc.listMdrCases(Number(id))));
  }

  async deleteMdr(id: number): Promise<void> {
    if (!confirm('MDR case verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrCase(id));
    const panelId = this.selectedPanelId();
    if (panelId) await this.onPanelChange(panelId);
  }
}
