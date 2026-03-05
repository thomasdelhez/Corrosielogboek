import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UpdateHoleInput } from '../models/corrosion.inputs';
import { Hole } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-detail-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main style="padding: 24px; max-width: 760px;">
      <p><a routerLink="/corrosion">← Terug naar overzicht</a></p>
      <h2>Hole detail</h2>

      @if (hole(); as h) {
        <p><strong>Hole #:</strong> {{ h.holeNumber }}</p>

        <form (ngSubmit)="save()" style="display: grid; gap: 12px;">
          <label>
            Final hole size
            <input type="number" [(ngModel)]="form.finalHoleSize" name="finalHoleSize" />
          </label>

          <label>
            Fit
            <input type="text" [(ngModel)]="form.fit" name="fit" />
          </label>

          <label>
            MDR code
            <input type="text" [(ngModel)]="form.mdrCode" name="mdrCode" />
          </label>

          <label>
            MDR version
            <input type="text" [(ngModel)]="form.mdrVersion" name="mdrVersion" />
          </label>

          <label>
            Inspection status
            <input type="text" [(ngModel)]="form.inspectionStatus" name="inspectionStatus" />
          </label>

          <label>
            NDI initials
            <input type="text" [(ngModel)]="form.ndiNameInitials" name="ndiNameInitials" />
          </label>

          <label>
            NDI finished
            <input type="checkbox" [(ngModel)]="form.ndiFinished" name="ndiFinished" />
          </label>

          <label>
            NDI inspection date
            <input type="datetime-local" [(ngModel)]="ndiInspectionDateLocal" name="ndiInspectionDateLocal" />
          </label>

          <div style="display:flex; gap:8px; align-items:center;">
            <button type="submit" [disabled]="saving()">{{ saving() ? 'Opslaan...' : 'Opslaan' }}</button>
            @if (message()) {
              <span>{{ message() }}</span>
            }
          </div>
        </form>
      } @else {
        <p>Laden...</p>
      }
    </main>
  `,
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corrosionService = inject(CorrosionService);

  protected readonly hole = signal<Hole | null>(null);
  protected readonly saving = signal<boolean>(false);
  protected readonly message = signal<string>('');

  protected form: UpdateHoleInput = {
    maxBpDiameter: null,
    finalHoleSize: null,
    fit: null,
    mdrCode: null,
    mdrVersion: null,
    ndiNameInitials: null,
    ndiInspectionDate: null,
    ndiFinished: false,
    inspectionStatus: null,
  };

  protected ndiInspectionDateLocal = '';

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const hole = await firstValueFrom(this.corrosionService.getHole(id));
    this.hole.set(hole);

    this.form = {
      maxBpDiameter: hole.maxBpDiameter,
      finalHoleSize: hole.finalHoleSize,
      fit: hole.fit,
      mdrCode: hole.mdrCode,
      mdrVersion: hole.mdrVersion,
      ndiNameInitials: hole.ndiNameInitials,
      ndiInspectionDate: hole.ndiInspectionDate,
      ndiFinished: hole.ndiFinished,
      inspectionStatus: hole.inspectionStatus,
    };

    this.ndiInspectionDateLocal = hole.ndiInspectionDate ? this.toLocalInputValue(hole.ndiInspectionDate) : '';
  }

  async save(): Promise<void> {
    const current = this.hole();
    if (!current) return;

    this.saving.set(true);
    this.message.set('');

    try {
      const ndiDate = this.ndiInspectionDateLocal ? new Date(this.ndiInspectionDateLocal) : null;
      const updated = await firstValueFrom(
        this.corrosionService.updateHole(current.id, {
          ...this.form,
          ndiInspectionDate: ndiDate,
        })
      );
      this.hole.set(updated);
      this.message.set('Opgeslagen ✅');
    } catch {
      this.message.set('Opslaan mislukt ❌');
    } finally {
      this.saving.set(false);
    }
  }

  private toLocalInputValue(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
