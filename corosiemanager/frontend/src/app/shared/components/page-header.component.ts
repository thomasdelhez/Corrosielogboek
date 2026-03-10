import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="copy">
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <div class="heading-row">
          @if (backLink()) {
            <a class="back-link" [routerLink]="backLink()!">{{ backLabel() }}</a>
          }
          <div>
            <h1>{{ title() }}</h1>
            @if (subtitle()) {
              <p class="subtitle">{{ subtitle() }}</p>
            }
          </div>
        </div>
      </div>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .copy{display:grid;gap:8px}
    .eyebrow{margin:0;color:var(--color-brand);font-size:.76rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .heading-row{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap}
    .back-link{
      display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border-radius:999px;text-decoration:none;
      background:rgba(255,255,255,.72);border:1px solid var(--color-line);font-weight:700;color:var(--color-ink);
    }
    h1{margin:0;font:700 clamp(1.55rem,2vw,2.2rem)/1.05 var(--font-heading);color:var(--color-ink-strong)}
    .subtitle{margin:8px 0 0;color:var(--color-ink-muted);max-width:70ch}
    .actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  `,
})
export class PageHeaderComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly backLink = input<string | null>(null);
  readonly backLabel = input<string>('Terug');
}
