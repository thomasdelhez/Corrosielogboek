import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HoleListComponent } from '../components/hole-list.component';
import { Hole } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';
import { RoutingService } from '../../../core/services/routing.service';

@Component({
  selector: 'app-corrosion-list-page',
  imports: [HoleListComponent],
  template: `
    <main style="padding: 24px;">
      <h2>Corrosie overzicht (Panel 1)</h2>
      <p>Referentie-architectuur: Page als container + dumb list component.</p>

      @if (loading()) {
        <p>Laden...</p>
      } @else {
        <app-hole-list [holes]="holes()" (open)="openHole($event)" />
      }
    </main>
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
