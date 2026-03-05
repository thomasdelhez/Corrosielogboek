import { Component, inject } from '@angular/core';
import { RoutingService } from '../services/routing.service';

@Component({
  selector: 'app-home-page',
  template: `
    <main style="padding: 24px;">
      <h1>F35 Corrosie Logboek</h1>
      <p>Angular referentie-architectuur scaffold.</p>
      <button (click)="openCorrosion()">Open Corrosie overzicht</button>
    </main>
  `,
})
export class HomePage {
  private readonly routing = inject(RoutingService);

  openCorrosion(): void {
    void this.routing.goToCorrosionList();
  }
}
