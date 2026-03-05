import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UpdateHoleInput, UpdateHolePartInput, UpdateHoleStepInput } from '../models/corrosion.inputs';
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
          <form class="form" (ngSubmit)="saveCore()">
            <h3>Kerngegevens</h3>
            <div class="grid">
              <label class="field"><span>Final hole size</span><input type="number" [(ngModel)]="form.finalHoleSize" name="finalHoleSize" /></label>
              <label class="field"><span>Fit</span><input type="text" [(ngModel)]="form.fit" name="fit" /></label>
              <label class="field"><span>MDR code</span><input type="text" [(ngModel)]="form.mdrCode" name="mdrCode" /></label>
              <label class="field"><span>MDR version</span><input type="text" [(ngModel)]="form.mdrVersion" name="mdrVersion" /></label>
              <label class="field"><span>Inspection status</span><input type="text" [(ngModel)]="form.inspectionStatus" name="inspectionStatus" /></label>
              <label class="field"><span>NDI initials</span><input type="text" [(ngModel)]="form.ndiNameInitials" name="ndiNameInitials" /></label>
              <label class="field"><span>NDI inspection date</span><input type="datetime-local" [(ngModel)]="ndiInspectionDateLocal" name="ndiInspectionDateLocal" /></label>
              <label class="field checkbox-field"><input type="checkbox" [(ngModel)]="form.ndiFinished" name="ndiFinished" /><span>NDI finished</span></label>
            </div>
            <footer class="actions">
              <button class="btn-primary" type="submit" [disabled]="savingCore()">{{ savingCore() ? 'Opslaan...' : 'Opslaan kern' }}</button>
              @if (coreMessage()) { <span class="message" [class.error]="coreMessage().includes('mislukt')">{{ coreMessage() }}</span> }
            </footer>
          </form>

          <section class="subcard">
            <h3>Steps</h3>
            @for (step of stepInputs; track step.stepNo; let i = $index) {
              <div class="row-grid">
                <label class="field small"><span>Step</span><input type="number" [(ngModel)]="step.stepNo" [name]="'stepNo'+i" /></label>
                <label class="field small"><span>Size</span><input type="number" [(ngModel)]="step.sizeValue" [name]="'size'+i" /></label>
                <label class="field"><span>Visual check</span><input type="text" [(ngModel)]="step.visualDamageCheck" [name]="'vdc'+i" /></label>
                <label class="field checkbox-field inline"><input type="checkbox" [(ngModel)]="step.mdrFlag" [name]="'mdr'+i" /><span>MDR</span></label>
                <label class="field checkbox-field inline"><input type="checkbox" [(ngModel)]="step.ndiFlag" [name]="'ndi'+i" /><span>NDI</span></label>
              </div>
            }
            <div class="actions">
              <button class="btn-secondary" type="button" (click)="addStep()">+ Step</button>
              <button class="btn-primary" type="button" (click)="saveSteps()" [disabled]="savingSteps()">{{ savingSteps() ? 'Opslaan...' : 'Opslaan steps' }}</button>
              @if (stepsMessage()) { <span class="message" [class.error]="stepsMessage().includes('mislukt') || stepsMessage().includes('Dubbele')">{{ stepsMessage() }}</span> }
            </div>
          </section>

          <section class="subcard">
            <h3>Parts</h3>
            @for (part of partInputs; track part.slotNo; let i = $index) {
              <div class="row-grid parts">
                <label class="field small"><span>Slot</span><input type="number" [(ngModel)]="part.slotNo" [name]="'slot'+i" /></label>
                <label class="field"><span>Part number</span><input type="text" [(ngModel)]="part.partNumber" [name]="'pn'+i" /></label>
                <label class="field small"><span>Length</span><input type="number" [(ngModel)]="part.partLength" [name]="'pl'+i" /></label>
                <label class="field"><span>Status</span><input type="text" [(ngModel)]="part.status" [name]="'ps'+i" /></label>
              </div>
            }
            <div class="actions">
              <button class="btn-secondary" type="button" (click)="addPart()">+ Part</button>
              <button class="btn-primary" type="button" (click)="saveParts()" [disabled]="savingParts()">{{ savingParts() ? 'Opslaan...' : 'Opslaan parts' }}</button>
              @if (partsMessage()) { <span class="message" [class.error]="partsMessage().includes('mislukt') || partsMessage().includes('Dubbele')">{{ partsMessage() }}</span> }
            </div>
          </section>
        } @else {
          <p class="loading">Laden...</p>
        }
      </section>
    </main>
  `,
  styles: `
    .page{max-width:980px;margin:0 auto;padding:24px}.back-link{display:inline-block;margin-bottom:12px;color:#334155;text-decoration:none;font-weight:600}
    .card,.subcard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.06);padding:20px}
    .subcard{margin-top:16px}.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .badge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:6px 10px;font-size:.85rem;font-weight:600}
    .form{display:grid;gap:12px}.grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}
    .row-grid{display:grid;gap:10px;grid-template-columns:80px 120px 1fr 100px 100px;margin-bottom:8px}.row-grid.parts{grid-template-columns:80px 1fr 120px 1fr}
    .field{display:grid;gap:6px;font-size:.92rem;color:#334155;font-weight:600}.field input{border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px}
    .small input{padding:8px}.checkbox-field{display:flex;align-items:center;gap:8px;padding-top:28px}.checkbox-field.inline{padding-top:22px}
    .actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}.btn-primary,.btn-secondary{border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#1e293b}.message{font-weight:600;color:#15803d}.message.error{color:#b91c1c}
    @media(max-width:900px){.grid,.row-grid,.row-grid.parts{grid-template-columns:1fr}.checkbox-field,.checkbox-field.inline{padding-top:0}}
  `,
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corrosionService = inject(CorrosionService);

  protected readonly hole = signal<Hole | null>(null);
  protected readonly savingCore = signal(false);
  protected readonly savingSteps = signal(false);
  protected readonly savingParts = signal(false);
  protected readonly coreMessage = signal('');
  protected readonly stepsMessage = signal('');
  protected readonly partsMessage = signal('');

  protected form: UpdateHoleInput = { maxBpDiameter: null, finalHoleSize: null, fit: null, mdrCode: null, mdrVersion: null, ndiNameInitials: null, ndiInspectionDate: null, ndiFinished: false, inspectionStatus: null };
  protected ndiInspectionDateLocal = '';
  protected stepInputs: UpdateHoleStepInput[] = [];
  protected partInputs: UpdateHolePartInput[] = [];

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const hole = await firstValueFrom(this.corrosionService.getHole(id));
    this.applyHole(hole);
  }

  async saveCore(): Promise<void> {
    const current = this.hole(); if (!current) return;
    this.savingCore.set(true); this.coreMessage.set('');
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHole(current.id, { ...this.form, ndiInspectionDate: this.ndiInspectionDateLocal ? new Date(this.ndiInspectionDateLocal) : null }));
      this.applyHole(updated); this.coreMessage.set('Kern opgeslagen ✅');
    } catch { this.coreMessage.set('Opslaan mislukt ❌'); } finally { this.savingCore.set(false); }
  }

  async saveSteps(): Promise<void> {
    const current = this.hole(); if (!current) return;
    const ids = this.stepInputs.map((s) => s.stepNo); if (new Set(ids).size !== ids.length) { this.stepsMessage.set('Dubbele step nummers zijn niet toegestaan'); return; }
    this.savingSteps.set(true); this.stepsMessage.set('');
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleSteps(current.id, this.stepInputs));
      this.applyHole(updated); this.stepsMessage.set('Steps opgeslagen ✅');
    } catch { this.stepsMessage.set('Opslaan mislukt ❌'); } finally { this.savingSteps.set(false); }
  }

  async saveParts(): Promise<void> {
    const current = this.hole(); if (!current) return;
    const ids = this.partInputs.map((p) => p.slotNo); if (new Set(ids).size !== ids.length) { this.partsMessage.set('Dubbele slot nummers zijn niet toegestaan'); return; }
    this.savingParts.set(true); this.partsMessage.set('');
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleParts(current.id, this.partInputs));
      this.applyHole(updated); this.partsMessage.set('Parts opgeslagen ✅');
    } catch { this.partsMessage.set('Opslaan mislukt ❌'); } finally { this.savingParts.set(false); }
  }

  addStep(): void { this.stepInputs = [...this.stepInputs, { stepNo: 0, sizeValue: null, visualDamageCheck: null, reamFlag: null, mdrFlag: null, ndiFlag: null }]; }
  addPart(): void { this.partInputs = [...this.partInputs, { slotNo: 1, partNumber: null, partLength: null, bushingType: null, standardCustom: null, orderedFlag: null, deliveredFlag: null, status: null }]; }

  private applyHole(hole: Hole): void {
    this.hole.set(hole);
    this.form = { maxBpDiameter: hole.maxBpDiameter, finalHoleSize: hole.finalHoleSize, fit: hole.fit, mdrCode: hole.mdrCode, mdrVersion: hole.mdrVersion, ndiNameInitials: hole.ndiNameInitials, ndiInspectionDate: hole.ndiInspectionDate, ndiFinished: hole.ndiFinished, inspectionStatus: hole.inspectionStatus };
    this.ndiInspectionDateLocal = hole.ndiInspectionDate ? this.toLocalInputValue(hole.ndiInspectionDate) : '';
    this.stepInputs = hole.steps.map((s) => ({ stepNo: s.stepNo, sizeValue: s.sizeValue, visualDamageCheck: s.visualDamageCheck, reamFlag: s.reamFlag, mdrFlag: s.mdrFlag, ndiFlag: s.ndiFlag }));
    this.partInputs = hole.parts.map((p) => ({ slotNo: p.slotNo, partNumber: p.partNumber, partLength: p.partLength, bushingType: p.bushingType, standardCustom: p.standardCustom, orderedFlag: p.orderedFlag, deliveredFlag: p.deliveredFlag, status: p.status }));
  }

  private toLocalInputValue(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
