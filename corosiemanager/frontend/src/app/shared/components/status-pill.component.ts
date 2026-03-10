import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  templateUrl: './status-pill.component.html',
  styleUrl: './status-pill.component.scss',
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
