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
    <main class="page">
      <a class="back-link" routerLink="/corrosion">← Terug naar overzicht</a>

      <section class="card">
        <header class="card-header">
          <h2>Hole detail</h2>
          @if (hole(); as h) {
            <span class="badge">Hole #{{ h.holeNumber }}</span>
          }
        </header>

        @if (hole()) {
          <form class="form" (ngSubmit)="save()">
            <div class="grid">
              <label class="field">
                <span>Final hole size</span>
                <input type="number" [(ngModel)]="form.finalHoleSize" name="finalHoleSize" />
              </label>

              <label class="field">
                <span>Fit</span>
                <input type="text" [(ngModel)]="form.fit" name="fit" />
              </label>

              <label class="field">
                <span>MDR code</span>
                <input type="text" [(ngModel)]="form.mdrCode" name="mdrCode" />
              </label>

              <label class="field">
                <span>MDR version</span>
                <input type="text" [(ngModel)]="form.mdrVersion" name="mdrVersion" />
              </label>

              <label class="field">
                <span>Inspection status</span>
                <input type="text" [(ngModel)]="form.inspectionStatus" name="inspectionStatus" />
              </label>

              <label class="field">
                <span>NDI initials</span>
                <input type="text" [(ngModel)]="form.ndiNameInitials" name="ndiNameInitials" />
              </label>

              <label class="field">
                <span>NDI inspection date</span>
                <input type="datetime-local" [(ngModel)]="ndiInspectionDateLocal" name="ndiInspectionDateLocal" />
              </label>

              <label class="field checkbox-field">
                <input type="checkbox" [(ngModel)]="form.ndiFinished" name="ndiFinished" />
                <span>NDI finished</span>
              </label>
            </div>

            <footer class="actions">
              <button class="btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Opslaan...' : 'Opslaan' }}
              </button>

              @if (message()) {
                <span class="message" [class.error]="message().includes('mislukt')">{{ message() }}</span>
              }
            </footer>
          </form>
        } @else {
          <p class="loading">Laden...</p>
        }
      </section>
    </main>
  `,
  styles: `
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 12px;
      color: #334155;
      text-decoration: none;
      font-weight: 600;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      padding: 20px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }

    h2 {
      margin: 0;
      font-size: 1.4rem;
      color: #0f172a;
    }

    .badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .form {
      display: grid;
      gap: 16px;
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .field {
      display: grid;
      gap: 6px;
      font-size: 0.92rem;
      color: #334155;
      font-weight: 600;
    }

    .field input {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.95rem;
      color: #0f172a;
      background: #fff;
    }

    .field input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 28px;
    }

    .checkbox-field input {
      width: 16px;
      height: 16px;
      accent-color: #2563eb;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
    }

    .btn-primary {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      background: #2563eb;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-primary:hover:enabled {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .message {
      font-weight: 600;
      color: #15803d;
    }

    .message.error {
      color: #b91c1c;
    }

    .loading {
      margin: 0;
      color: #475569;
    }

    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .checkbox-field {
        padding-top: 0;
      }
    }
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
