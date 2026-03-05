import { Component, input, output } from '@angular/core';
import { Hole } from '../models/corrosion.models';

@Component({
  selector: 'app-hole-list',
  template: `
    <div class="table-wrap">
      <table>
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
              <td>#{{ item.holeNumber }}</td>
              <td>{{ item.inspectionStatus ?? '-' }}</td>
              <td>{{ item.mdrCode ?? '-' }}</td>
              <td class="actions-col">
                <button class="btn-link" (click)="open.emit(item.id)">Open</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .table-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }

    thead {
      background: #f8fafc;
    }

    th,
    td {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid #eef2f7;
      color: #1e293b;
      font-size: 0.95rem;
    }

    th {
      color: #334155;
      font-weight: 700;
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    tbody tr:hover {
      background: #f8fbff;
    }

    .actions-col {
      width: 120px;
    }

    .btn-link {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 8px;
      padding: 6px 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-link:hover {
      background: #dbeafe;
    }
  `,
})
export class HoleListComponent {
  readonly holes = input.required<Hole[]>();
  readonly open = output<number>();
}
