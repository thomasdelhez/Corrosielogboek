import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  template: `<span class="pill" [class.brand]="tone() === 'brand'" [class.success]="tone() === 'success'" [class.warning]="tone() === 'warning'" [class.neutral]="tone() === 'neutral'">{{ label() }}</span>`,
  styles: `
    .pill{
      display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;
      border:1px solid var(--color-line);background:var(--surface-subtle);color:var(--color-ink);font-weight:700;font-size:.83rem;
    }
    .pill.brand{background:var(--color-brand-soft);color:var(--color-brand);border-color:rgba(21,94,239,.18)}
    .pill.success{background:#ebfbf7;color:#0f766e;border-color:rgba(13,148,136,.18)}
    .pill.warning{background:var(--color-warning-soft);color:var(--color-warning-ink);border-color:rgba(133,91,0,.16)}
    .pill.neutral{background:var(--surface-subtle);color:var(--color-ink)}
  `,
})
export class StatusPillComponent {
  readonly label = input.required<string>();
  readonly state = input<string | null>(null);
  readonly tone = computed<'brand' | 'success' | 'warning' | 'neutral'>(() => {
    const value = (this.state() || this.label()).toLowerCase();
    if (['approved', 'closed', 'clean', 'finished', 'delivered'].includes(value)) return 'success';
    if (['in review', 'open', 'request', 'submit', 'report_needed'].includes(value)) return 'brand';
    if (['rejected', 'corroded', 'rifled', 'action_needed', 'awaiting request'].includes(value)) return 'warning';
    return 'neutral';
  });
}
