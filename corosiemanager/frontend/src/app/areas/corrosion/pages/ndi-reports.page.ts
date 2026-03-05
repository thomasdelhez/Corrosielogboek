import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NdiReport } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-ndi-reports-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Main Menu</a>
      <section class="card">
        <h2>NDI Reports</h2>
        <div class="row">
          <input type="number" [(ngModel)]="holeId" placeholder="Hole ID" />
          <button (click)="load()">Laden</button>
        </div>
        @for (r of reports(); track r.id) {
          <p>#{{ r.id }} · {{ r.method ?? '-' }} · {{ r.corrosionPosition ?? '-' }} <button (click)="delete(r.id)">Verwijder</button></p>
        }
      </section>
    </main>
  `,
  styles: `.page{max-width:900px;margin:0 auto;padding:24px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px}.row{display:flex;gap:8px;margin:10px 0}input{padding:8px;border:1px solid #cbd5e1;border-radius:8px}.back{text-decoration:none;color:#334155}`,
})
export class NdiReportsPage {
  private readonly svc = inject(CorrosionService);
  protected holeId = 1;
  protected readonly reports = signal<NdiReport[]>([]);

  async load(): Promise<void> {
    this.reports.set(await firstValueFrom(this.svc.listNdiReports(this.holeId)));
  }

  async delete(id: number): Promise<void> {
    if (!confirm('NDI report verwijderen?')) return;
    await firstValueFrom(this.svc.deleteNdiReport(id));
    await this.load();
  }
}
