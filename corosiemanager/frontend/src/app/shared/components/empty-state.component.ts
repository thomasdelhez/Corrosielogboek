import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly eyebrow = input<string>('Nog niets om te tonen');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
