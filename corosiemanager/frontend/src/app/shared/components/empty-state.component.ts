import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <section class="empty-state">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      <div class="actions">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .empty-state{
      padding:22px;border:1px dashed var(--color-line-strong);border-radius:18px;
      background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(245,248,251,.96));
      text-align:left;
    }
    .eyebrow{margin:0 0 6px;color:var(--color-brand);font-size:.74rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
    h3{margin:0 0 8px;font:700 1.15rem/1.15 var(--font-heading);color:var(--color-ink-strong)}
    p{margin:0;color:var(--color-ink-muted);max-width:62ch}
    .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  `,
})
export class EmptyStateComponent {
  readonly eyebrow = input<string>('Nog niets om te tonen');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
