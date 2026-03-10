import { Component, input, output } from '@angular/core';
import { Hole } from '../models/corrosion.models';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';

@Component({
  selector: 'app-hole-list',
  imports: [StatusPillComponent],
  templateUrl: './hole-list.component.html',
  styleUrl: './hole-list.component.scss',
})
export class HoleListComponent {
  readonly holes = input.required<Hole[]>();
  readonly open = output<number>();
}
