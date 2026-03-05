import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { HoleListComponent } from '../components/hole-list.component';
import { Hole } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-list-page',
  imports: [HoleListComponent],
  template: `
    <main class="page">
      <section class="card">
        <header class="header">
          <div>
            <p class="eyebrow">Corrosiemanager</p>
            <h2>Corrosie overzicht</h2>
            <p class="subtitle">Panel 1 · overzicht van geregistreerde holes</p>
          </div>
        </header>

        @if (loading()) {
          <p class="loading">Laden...</p>
        } @else if (holes().length === 0) {
          <p class="empty">Nog geen holes gevonden voor dit panel.</p>
        } @else {
          <app-hole-list [holes]="holes()" (open)="openHole($event)" />
        }
      </section>
    </main>
  `,
  styles: `
    .page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      padding: 20px;
    }

    .header {
      margin-bottom: 16px;
    }

    .eyebrow {
      margin: 0 0 6px;
      color: #2563eb;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: 1.4rem;
      color: #0f172a;
    }

    .subtitle {
      margin: 6px 0 0;
      color: #64748b;
    }

    .loading,
    .empty {
      margin: 0;
      color: #475569;
      padding: 10px 0;
    }
  `,
})
export class CorrosionListPage implements OnInit {
  private readonly corrosionService = inject(CorrosionService);
  private readonly routing = inject(RoutingService);

  protected readonly holes = signal<Hole[]>([]);
  protected readonly loading = signal<boolean>(true);

  async ngOnInit(): Promise<void> {
    const holes = await firstValueFrom(this.corrosionService.listPanelHoles(1));
    this.holes.set(holes);
    this.loading.set(false);
  }

  openHole(holeId: number): void {
    void this.routing.goToCorrosionDetail(holeId);
  }
}
