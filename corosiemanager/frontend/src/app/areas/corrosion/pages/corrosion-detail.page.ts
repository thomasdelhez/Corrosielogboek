import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CreateMdrCaseInput,
  CreateNdiReportInput,
  UpdateHoleInput,
  UpdateHolePartInput,
  UpdateHoleStepInput,
} from '../models/corrosion.inputs';
import { Hole, MdrCase, MdrRequestDetail, NdiReport } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-detail-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a class="back-link" routerLink="/corrosion">← Terug naar overzicht</a>
      <section class="card">
        <header class="card-header"><h2>Hole detail</h2>@if (hole(); as h) {<span class="badge">Hole #{{ h.holeNumber }}</span>}</header>

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
            </div>
            <div class="actions"><button class="btn-primary" type="submit">Opslaan kern</button><span class="message">{{ coreMessage() }}</span></div>
          </form>

          <section class="subcard"><h3>Steps</h3><div class="actions"><button class="btn-secondary" type="button" (click)="addStep()">+ Step</button><button class="btn-primary" type="button" (click)="saveSteps()">Opslaan steps</button><span class="message">{{ stepsMessage() }}</span></div></section>
          <section class="subcard"><h3>Parts</h3><div class="actions"><button class="btn-secondary" type="button" (click)="addPart()">+ Part</button><button class="btn-primary" type="button" (click)="saveParts()">Opslaan parts</button><span class="message">{{ partsMessage() }}</span></div></section>

          <section class="subcard">
            <h3>MDR cases (panel)</h3>
            @for (m of mdrCases(); track m.id) {<p>#{{ m.id }} · {{ m.mdrNumber ?? '-' }} · {{ m.status ?? '-' }}</p>}
            <div class="grid">
              <label class="field"><span>MDR number</span><input type="text" [(ngModel)]="newMdr.mdrNumber" name="newMdrNumber" /></label>
              <label class="field"><span>Status</span><input type="text" [(ngModel)]="newMdr.status" name="newMdrStatus" /></label>
            </div>
            <div class="actions"><button class="btn-primary" type="button" (click)="createMdrCase()">+ MDR case</button><span class="message">{{ mdrMessage() }}</span></div>

            <h4 style="margin-top:12px;">MDR request details (uit Access MDRListT)</h4>
            @if (mdrRequestDetails().length === 0) {
              <p>Geen MDR request details voor dit panel.</p>
            } @else {
              <div class="details-grid">
                @for (d of mdrRequestDetails(); track d.id) {
                  <article class="detail-card">
                    <h5>#{{ d.id }} · {{ d.defectCode ?? 'No defect code' }}</h5>
                    <p><strong>TVE:</strong> {{ d.tve ?? '-' }}</p>
                    <p><strong>MDR type:</strong> {{ d.mdrType ?? '-' }}</p>
                    <p><strong>Discovered by:</strong> {{ d.discoveredBy ?? '-' }}</p>
                    <p><strong>Part/Serial:</strong> {{ d.partNumber ?? '-' }} / {{ d.serialNumber ?? '-' }}</p>
                    <p><strong>Problem:</strong> {{ d.problemStatement ?? '-' }}</p>
                  </article>
                }
              </div>
            }
          </section>

          <section class="subcard">
            <h3>NDI reports (hole)</h3>
            @for (r of ndiReports(); track r.id) {<p>#{{ r.id }} · {{ r.method ?? '-' }} · {{ r.corrosionPosition ?? '-' }}</p>}
            <div class="grid">
              <label class="field"><span>Initials</span><input type="text" [(ngModel)]="newNdi.nameInitials" name="newNdiInitials" /></label>
              <label class="field"><span>Method</span><input type="text" [(ngModel)]="newNdi.method" name="newNdiMethod" /></label>
            </div>
            <div class="actions"><button class="btn-primary" type="button" (click)="createNdiReport()">+ NDI report</button><span class="message">{{ ndiMessage() }}</span></div>
          </section>
        } @else {
          <p>Laden...</p>
        }
      </section>
    </main>
  `,
  styles: `.page{max-width:980px;margin:0 auto;padding:24px}.card,.subcard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px}.subcard{margin-top:14px}.card-header{display:flex;justify-content:space-between}.grid{display:grid;gap:10px;grid-template-columns:1fr 1fr}.field{display:grid;gap:6px}.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.btn-primary{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px}.btn-secondary{background:#e2e8f0;border:0;border-radius:8px;padding:8px 12px}.badge{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:4px 10px}.message{color:#15803d;font-weight:600}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.detail-card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}.detail-card h5{margin:0 0 6px 0}.detail-card p{margin:2px 0}`,
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corrosionService = inject(CorrosionService);

  protected readonly hole = signal<Hole | null>(null);
  protected readonly mdrCases = signal<MdrCase[]>([]);
  protected readonly mdrRequestDetails = signal<MdrRequestDetail[]>([]);
  protected readonly ndiReports = signal<NdiReport[]>([]);
  protected readonly coreMessage = signal('');
  protected readonly stepsMessage = signal('');
  protected readonly partsMessage = signal('');
  protected readonly mdrMessage = signal('');
  protected readonly ndiMessage = signal('');

  protected form: UpdateHoleInput = { maxBpDiameter: null, finalHoleSize: null, fit: null, mdrCode: null, mdrVersion: null, ndiNameInitials: null, ndiInspectionDate: null, ndiFinished: false, inspectionStatus: null };
  protected stepInputs: UpdateHoleStepInput[] = [];
  protected partInputs: UpdateHolePartInput[] = [];
  protected newMdr: CreateMdrCaseInput = { panelId: null, mdrNumber: null, mdrVersion: null, subject: null, status: null, submittedBy: null, requestDate: null, needDate: null, approved: false };
  protected newNdi: CreateNdiReportInput = { panelId: null, nameInitials: null, inspectionDate: null, method: null, tools: null, corrosionPosition: null };

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const hole = await firstValueFrom(this.corrosionService.getHole(id));
    this.applyHole(hole);
    await this.reloadMdrAndNdi();
  }

  async saveCore(): Promise<void> {
    const h = this.hole();
    if (!h) return;

    if (this.form.ndiFinished && !this.form.ndiNameInitials) {
      this.coreMessage.set('NDI initials zijn verplicht als NDI finished aan staat.');
      return;
    }

    try {
      const updated = await firstValueFrom(this.corrosionService.updateHole(h.id, this.form));
      this.applyHole(updated);
      this.coreMessage.set('Opgeslagen ✅');
    } catch {
      this.coreMessage.set('Opslaan mislukt ❌');
    }
  }

  async saveSteps(): Promise<void> {
    const h = this.hole();
    if (!h) return;

    const ids = this.stepInputs.map((s) => s.stepNo);
    if (new Set(ids).size !== ids.length) {
      this.stepsMessage.set('Dubbele step nummers zijn niet toegestaan.');
      return;
    }

    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleSteps(h.id, this.stepInputs));
      this.applyHole(updated);
      this.stepsMessage.set('Steps opgeslagen ✅');
    } catch {
      this.stepsMessage.set('Opslaan mislukt ❌');
    }
  }

  async saveParts(): Promise<void> {
    const h = this.hole();
    if (!h) return;

    const ids = this.partInputs.map((p) => p.slotNo);
    if (new Set(ids).size !== ids.length) {
      this.partsMessage.set('Dubbele slot nummers zijn niet toegestaan.');
      return;
    }

    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleParts(h.id, this.partInputs));
      this.applyHole(updated);
      this.partsMessage.set('Parts opgeslagen ✅');
    } catch {
      this.partsMessage.set('Opslaan mislukt ❌');
    }
  }

  async createMdrCase(): Promise<void> { const h = this.hole(); if (!h) return; await firstValueFrom(this.corrosionService.createMdrCase({ ...this.newMdr, panelId: h.panelId })); this.mdrMessage.set('MDR case toegevoegd ✅'); await this.reloadMdrAndNdi(); }
  async createNdiReport(): Promise<void> { const h = this.hole(); if (!h) return; await firstValueFrom(this.corrosionService.createNdiReport(h.id, { ...this.newNdi, panelId: h.panelId })); this.ndiMessage.set('NDI report toegevoegd ✅'); await this.reloadMdrAndNdi(); }

  addStep(): void { this.stepInputs = [...this.stepInputs, { stepNo: 0, sizeValue: null, visualDamageCheck: null, reamFlag: null, mdrFlag: null, ndiFlag: null }]; }
  addPart(): void { this.partInputs = [...this.partInputs, { slotNo: 1, partNumber: null, partLength: null, bushingType: null, standardCustom: null, orderedFlag: null, deliveredFlag: null, status: null }]; }

  private async reloadMdrAndNdi(): Promise<void> {
    const h = this.hole();
    if (!h) return;
    this.mdrCases.set(await firstValueFrom(this.corrosionService.listMdrCases(h.panelId ?? undefined)));
    if (h.panelId) {
      this.mdrRequestDetails.set(await firstValueFrom(this.corrosionService.listMdrRequestDetails(h.panelId)));
    } else {
      this.mdrRequestDetails.set([]);
    }
    this.ndiReports.set(await firstValueFrom(this.corrosionService.listNdiReports(h.id)));
  }

  private applyHole(hole: Hole): void {
    this.hole.set(hole);
    this.form = { maxBpDiameter: hole.maxBpDiameter, finalHoleSize: hole.finalHoleSize, fit: hole.fit, mdrCode: hole.mdrCode, mdrVersion: hole.mdrVersion, ndiNameInitials: hole.ndiNameInitials, ndiInspectionDate: hole.ndiInspectionDate, ndiFinished: hole.ndiFinished, inspectionStatus: hole.inspectionStatus };
    this.stepInputs = hole.steps.map((s) => ({ stepNo: s.stepNo, sizeValue: s.sizeValue, visualDamageCheck: s.visualDamageCheck, reamFlag: s.reamFlag, mdrFlag: s.mdrFlag, ndiFlag: s.ndiFlag }));
    this.partInputs = hole.parts.map((p) => ({ slotNo: p.slotNo, partNumber: p.partNumber, partLength: p.partLength, bushingType: p.bushingType, standardCustom: p.standardCustom, orderedFlag: p.orderedFlag, deliveredFlag: p.deliveredFlag, status: p.status }));
  }
}
