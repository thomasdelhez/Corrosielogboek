import { Component, inject } from '@angular/core';
import { RoutingService } from '../services/routing.service';

@Component({
  selector: 'app-home-page',
  template: `
    <main class="page">
      <section class="hero-card">
        <p class="eyebrow">F35 Corrosie Logboek</p>
        <h1>Welkom bij Corrosiemanager</h1>
        <p class="subtitle">
          Moderne vervanging van de Access-tool, met focus op snelle en correcte engineer invoer.
        </p>

        <div class="actions">
          <button class="btn-primary" (click)="openCorrosion()">Open corrosie overzicht</button>
        </div>
      </section>
    </main>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      padding: 32px 24px;
      display: grid;
      place-items: start center;
    }

    .hero-card {
      width: 100%;
      max-width: 900px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      padding: 28px;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #2563eb;
      font-size: 0.86rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #0f172a;
      font-size: clamp(1.5rem, 2.2vw, 2rem);
    }

    .subtitle {
      margin: 12px 0 0;
      color: #475569;
      max-width: 70ch;
      line-height: 1.5;
    }

    .actions {
      margin-top: 20px;
    }

    .btn-primary {
      border: 0;
      border-radius: 10px;
      padding: 11px 16px;
      background: #2563eb;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }
  `,
})
export class HomePage {
  private readonly routing = inject(RoutingService);

  openCorrosion(): void {
    void this.routing.goToCorrosionList();
  }
}
