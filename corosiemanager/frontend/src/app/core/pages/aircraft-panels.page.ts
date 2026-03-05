import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-aircraft-panels-page',
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h2>Aircraft & Panels</h2>
        <p>Start hier met aircraft selectie en panel filtering.</p>
        <div class="actions">
          <a routerLink="/corrosion" class="btn">Open workflow</a>
          <a routerLink="/" class="btn ghost">Terug naar Main Menu</a>
        </div>
      </section>
    </main>
  `,
  styles: `.page{max-width:920px;margin:0 auto;padding:24px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:20px}.actions{display:flex;gap:8px}.btn{background:#2563eb;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none}.ghost{background:#e2e8f0;color:#334155}`,
})
export class AircraftPanelsPage {}
