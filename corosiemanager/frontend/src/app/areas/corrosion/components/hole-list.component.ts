import { Component, input, output } from '@angular/core';
import { Hole } from '../models/corrosion.models';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';

@Component({
  selector: 'app-hole-list',
  imports: [StatusPillComponent],
  template: `
    <div class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Hole</th>
            <th>Status</th>
            <th>MDR</th>
            <th class="actions-col">Actie</th>
          </tr>
        </thead>
        <tbody>
          @for (item of holes(); track item.id) {
            <tr>
              <td>
                <div class="hole-meta">
                  <strong>#{{ item.holeNumber }}</strong>
                  @if (item.finalHoleSize) {
                    <span class="ui-meta">Final {{ item.finalHoleSize }}</span>
                  }
                </div>
              </td>
              <td>
                @if (item.inspectionStatus) {
                  <app-status-pill [label]="item.inspectionStatus" [state]="item.inspectionStatus" />
                } @else {
                  <span class="ui-meta">Nog niet gezet</span>
                }
              </td>
              <td>
                @if (item.mdrCode) {
                  <span class="ui-chip brand">{{ item.mdrCode }}</span>
                } @else {
                  <span class="ui-meta">Geen MDR</span>
                }
              </td>
              <td class="actions-col">
                <button class="ui-btn-ghost" (click)="open.emit(item.id)">Open detail</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .actions-col { width: 160px; }
    .hole-meta{display:grid;gap:4px}
  `,
})
export class HoleListComponent {
  readonly holes = input.required<Hole[]>();
  readonly open = output<number>();
}
