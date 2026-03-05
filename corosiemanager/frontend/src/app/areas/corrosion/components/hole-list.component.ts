import { Component, input, output } from '@angular/core';
import { Hole } from '../models/corrosion.models';

@Component({
  selector: 'app-hole-list',
  template: `
    <table border="1" cellpadding="8" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th>Hole</th>
          <th>Status</th>
          <th>MDR</th>
          <th>Actie</th>
        </tr>
      </thead>
      <tbody>
        @for (item of holes(); track item.id) {
          <tr>
            <td>{{ item.holeNumber }}</td>
            <td>{{ item.inspectionStatus ?? '-' }}</td>
            <td>{{ item.mdrCode ?? '-' }}</td>
            <td><button (click)="open.emit(item.id)">Open</button></td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class HoleListComponent {
  readonly holes = input.required<Hole[]>();
  readonly open = output<number>();
}
