import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
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
          <div>
            <h2>Hole detail</h2>
            <p class="subtitle">Werk kerngegevens, steps en parts bij op één plek.</p>
          </div>
          @if (hole(); as h) {
            <div class="badge-wrap">
              <span class="badge">Hole #{{ h.holeNumber }}</span>
              @if (h.inspectionStatus) {
                <span class="badge badge-soft">{{ h.inspectionStatus }}</span>
              }
            </div>
          }
        </header>

        @if (hole()) {
          @if (hole(); as h) {
            <section class="meta-strip">
              <span class="meta-pill">MDR: {{ h.mdrCode || '-' }}</span>
              <span class="meta-pill">Versie: {{ h.mdrVersion || '-' }}</span>
              <span class="meta-pill">Fit: {{ h.fit || '-' }}</span>
              <span class="meta-pill">Final size: {{ h.finalHoleSize ?? '-' }}</span>
            </section>
          }
          <form class="form" (ngSubmit)="saveCore()">
            <div class="section-head">
              <h3>Kerngegevens</h3>
            </div>
            @if (!canEditHole()) {
              <p class="readonly-note">Alleen engineer/admin kan hole-data wijzigen.</p>
            }
            <fieldset [disabled]="!canEditHole()">
              <div class="grid">
                <label class="field"><span>Max BP diameter</span><input [(ngModel)]="form.maxBpDiameter" name="maxBpDiameter" type="number" /></label>
                <label class="field"><span>Final hole size</span><input [(ngModel)]="form.finalHoleSize" name="finalHoleSize" type="number" /></label>
                <label class="field"><span>Fit</span><input [(ngModel)]="form.fit" name="fit" type="text" /></label>
                <label class="field"><span>MDR code</span><input [(ngModel)]="form.mdrCode" name="mdrCode" type="text" /></label>
                <label class="field"><span>MDR version</span><input [(ngModel)]="form.mdrVersion" name="mdrVersion" type="text" /></label>
                <label class="field"><span>TOTAL StackUp Length</span><input [(ngModel)]="form.totalStackupLength" name="totalStackupLength" type="text" /></label>
                <label class="field"><span>Stack up</span><input [(ngModel)]="form.stackUp" name="stackUp" type="number" /></label>
                <label class="field">
                  <span>Sleeve/Bushings</span>
                  <select [(ngModel)]="form.sleeveBushings" name="sleeveBushings">
                    <option [ngValue]="null">-- Selecteer --</option>
                    @for (opt of withCurrentOptions(sleeveBushingOptions, form.sleeveBushings); track opt) {
                      <option [ngValue]="opt">{{ opt }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Nutplate Inspection</span>
                  <select [(ngModel)]="form.nutplateInspection" name="nutplateInspection">
                    <option [ngValue]="null">-- Selecteer --</option>
                    @for (opt of withCurrentOptions(nutplateConditionOptions, form.nutplateInspection); track opt) {
                      <option [ngValue]="opt">{{ opt }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Nutplate Surface Corrosion</span>
                  <select [(ngModel)]="form.nutplateSurfaceCorrosion" name="nutplateSurfaceCorrosion">
                    <option [ngValue]="null">-- Selecteer --</option>
                    @for (opt of withCurrentOptions(nutplateConditionOptions, form.nutplateSurfaceCorrosion); track opt) {
                      <option [ngValue]="opt">{{ opt }}</option>
                    }
                  </select>
                </label>
                <label class="field"><span>TOTAL Structure Thickness</span><input [(ngModel)]="form.totalStructureThickness" name="totalStructureThickness" type="text" /></label>
                <label class="field"><span>FlexHone</span><input [(ngModel)]="form.flexhone" name="flexhone" type="text" /></label>
                <label class="field">
                  <span>Inspection status</span>
                  <select [(ngModel)]="form.inspectionStatus" name="inspectionStatus">
                    <option [ngValue]="null">-- Selecteer status --</option>
                    @for (opt of inspectionStatusOptions; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                </label>
                <label class="field"><span>NDI initials</span><input [(ngModel)]="form.ndiNameInitials" name="ndiNameInitials" type="text" /></label>
                <label class="field"><span>NDI inspection date</span><input [(ngModel)]="ndiInspectionDateInput" name="ndiInspectionDateInput" type="date" /></label>
                <label class="field"><span><input [(ngModel)]="form.ndiFinished" name="ndiFinished" type="checkbox" /> NDI Finished</span></label>
                <label class="field"><span><input [(ngModel)]="form.mdrResubmit" name="mdrResubmit" type="checkbox" /> MDR Resubmit</span></label>
                <label class="field"><span><input [(ngModel)]="form.countersinked" name="countersinked" type="checkbox" /> Countersinked</span></label>
                <label class="field"><span><input [(ngModel)]="form.clean" name="clean" type="checkbox" /> Clean</span></label>
                <label class="field"><span><input [(ngModel)]="form.cutSleeveBushing" name="cutSleeveBushing" type="checkbox" /> Cut Sleeve/Bushing</span></label>
                <label class="field"><span><input [(ngModel)]="form.installed" name="installed" type="checkbox" /> Installed</span></label>
                <label class="field"><span><input [(ngModel)]="form.primer" name="primer" type="checkbox" /> Primer</span></label>
                <label class="field"><span><input [(ngModel)]="form.surfaceCorrosion" name="surfaceCorrosion" type="checkbox" /> Surface Corrosion</span></label>
                <label class="field"><span><input [(ngModel)]="form.flexndi" name="flexndi" type="checkbox" /> FlexNDI</span></label>
              </div>
              <div class="actions"><button class="btn-primary" type="submit" [disabled]="savingCore()">{{ savingCore() ? 'Opslaan...' : 'Opslaan kern' }}</button></div>
            </fieldset>
          </form>

          <section class="subcard">
            <div class="section-head">
              <h3>Steps</h3>
              <span class="count-pill">{{ stepInputs.length }}</span>
            </div>
            <fieldset [disabled]="!canEditHole()">
              @for (s of stepInputs; track $index; let i = $index) {
                <div class="row-grid">
                  <input [(ngModel)]="s.stepNo" [name]="'stepNo'+i" type="number" placeholder="Step" />
                  <input [(ngModel)]="s.sizeValue" [name]="'sizeValue'+i" type="number" placeholder="Size" />
                  <select [(ngModel)]="s.visualDamageCheck" [name]="'visual'+i">
                    <option [ngValue]="null">-- DMG/CLEAN --</option>
                    @for (opt of dmgCleanOptions; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                  <label class="check-inline"><input [(ngModel)]="s.reamFlag" [name]="'ream'+i" type="checkbox" /> Ream</label>
                  <label><input [(ngModel)]="s.mdrFlag" [name]="'mdr'+i" type="checkbox" /> MDR</label>
                  <label><input [(ngModel)]="s.ndiFlag" [name]="'ndi'+i" type="checkbox" /> NDI</label>
                  <button class="btn-danger" type="button" (click)="removeStep(i)">Verwijder</button>
                </div>
              }
              <div class="actions">
                <button class="btn-secondary" type="button" (click)="addStep()">+ Step</button>
                <button class="btn-primary" type="button" (click)="saveSteps()" [disabled]="savingSteps()">{{ savingSteps() ? 'Opslaan...' : 'Opslaan steps' }}</button>
              </div>
            </fieldset>
          </section>

          <section class="subcard">
            <div class="section-head">
              <h3>Parts</h3>
              <span class="count-pill">{{ partInputs.length }}</span>
            </div>
            <p class="subtitle parts-note">Maximaal 4 parts per hole (slots 1 t/m 4).</p>
            <fieldset [disabled]="!canEditHole()">
              @for (p of partInputs; track $index; let i = $index) {
                <div class="row-grid parts">
                  <input [(ngModel)]="p.slotNo" [name]="'slot'+i" type="number" placeholder="Slot" />
                  <input [(ngModel)]="p.partNumber" [name]="'partNo'+i" type="text" placeholder="Part number" />
                  <input [(ngModel)]="p.partLength" [name]="'partLength'+i" type="number" placeholder="Length" />
                  <select [(ngModel)]="p.bushingType" [name]="'bushing'+i">
                    <option [ngValue]="null">-- SB/CS --</option>
                    @for (opt of bushingTypeOptions; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                  <select [(ngModel)]="p.standardCustom" [name]="'stdcst'+i">
                    <option [ngValue]="null">-- STD/CST --</option>
                    @for (opt of stdCstOptions; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                  <select [(ngModel)]="p.status" [name]="'status'+i">
                    <option [ngValue]="null">-- Status --</option>
                    @for (opt of withCurrentOptions(partStatusOptions, p.status); track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                  <label class="check-inline"><input [(ngModel)]="p.orderedFlag" [name]="'ordered'+i" type="checkbox" /> Ordered</label>
                  <label class="check-inline"><input [(ngModel)]="p.deliveredFlag" [name]="'delivered'+i" type="checkbox" /> Delivered</label>
                  <button class="btn-danger" type="button" (click)="removePart(i)">Verwijder</button>
                </div>
              }
              <div class="actions">
                <button class="btn-secondary" type="button" (click)="addPart()" [disabled]="partInputs.length >= 4">+ Part</button>
                <button class="btn-primary" type="button" (click)="saveParts()" [disabled]="savingParts()">{{ savingParts() ? 'Opslaan...' : 'Opslaan parts' }}</button>
              </div>
            </fieldset>
          </section>

        } @else {
          <p>Laden...</p>
        }
      </section>
    </main>
  `,
  styles: `
    .page{max-width:1040px;margin:0 auto;padding:24px}
    .back-link{display:inline-block;margin-bottom:10px;color:#334155;text-decoration:none;font-weight:600}
    .card,.subcard{background:#fff;border:1px solid #dbeafe;border-radius:16px;padding:20px}
    .subcard{margin-top:14px;background:#f8fafc}
    .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
    .subtitle{margin:6px 0 0;color:#64748b}
    .parts-note{margin:6px 0 12px}
    .badge-wrap{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .grid{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
    .field{display:grid;gap:6px;font-weight:600;color:#334155}
    fieldset{border:0;padding:0;margin:0;min-width:0}
    input,select{border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;background:#fff}
    .row-grid{display:grid;grid-template-columns:80px 120px minmax(130px,1fr) 90px 90px 90px 110px;gap:8px;margin-bottom:8px;align-items:center}
    .row-grid.parts{grid-template-columns:56px minmax(150px,1.6fr) 82px 96px 96px minmax(140px,1.2fr) 92px 98px 96px}
    .check-inline{display:flex;align-items:center;gap:6px;font-weight:600;color:#334155;white-space:nowrap;font-size:.92rem}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    .btn-primary{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:8px 12px;font-weight:700}
    .btn-primary:disabled{opacity:.55;cursor:not-allowed}
    .btn-secondary{background:#e2e8f0;border:0;border-radius:10px;padding:8px 12px;font-weight:700;color:#334155}
    .btn-secondary:disabled{opacity:.55;cursor:not-allowed}
    .btn-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;padding:7px 10px}
    .btn-danger.inline{margin-left:8px;padding:4px 8px}
    .badge{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:4px 10px}
    .badge-soft{background:#f1f5f9;color:#334155}
    .meta-strip{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 14px}
    .meta-pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#f1f5f9;color:#334155;font-size:.85rem;font-weight:700}
    .section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
    .section-head h3{margin:0}
    .count-pill{display:inline-block;padding:4px 9px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:.8rem;font-weight:700}
    .message{color:#15803d;font-weight:600}
    .readonly-note{margin:6px 0 10px;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;padding:8px 10px;border-radius:10px;font-weight:600}
    .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
    .detail-card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}
    .detail-card h5{margin:0 0 6px 0}.detail-card p{margin:2px 0}
    @media(max-width:900px){.grid,.row-grid,.row-grid.parts,.details-grid{grid-template-columns:1fr}}
  `,
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corrosionService = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

  protected readonly hole = signal<Hole | null>(null);
  protected readonly coreMessage = signal('');
  protected readonly stepsMessage = signal('');
  protected readonly partsMessage = signal('');
  protected readonly coreMessageType = signal<'success' | 'error' | 'info'>('info');
  protected readonly stepsMessageType = signal<'success' | 'error' | 'info'>('info');
  protected readonly partsMessageType = signal<'success' | 'error' | 'info'>('info');

  protected readonly savingCore = signal(false);
  protected readonly savingSteps = signal(false);
  protected readonly savingParts = signal(false);

  protected readonly inspectionStatusOptions = ['Clean', 'Rifled', 'Open', 'In Progress', 'Closed'];
  protected readonly partStatusOptions = ['Open', 'In Progress @EST', 'Ordered @981', 'Received @LSE', 'Delivered @Floor', 'Closed'];
  protected readonly dmgCleanOptions = ['CLEAN', 'DMG'];
  protected readonly bushingTypeOptions = ['SB', 'CS'];
  protected readonly stdCstOptions = ['STD', 'CST'];
  protected readonly sleeveBushingOptions = ['SB', 'CS'];
  protected readonly nutplateConditionOptions = ['CLEAN', 'DMG'];

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
    mdrResubmit: false,
    totalStackupLength: null,
    stackUp: null,
    sleeveBushings: null,
    countersinked: false,
    clean: false,
    cutSleeveBushing: false,
    installed: false,
    primer: false,
    surfaceCorrosion: false,
    nutplateInspection: null,
    nutplateSurfaceCorrosion: null,
    totalStructureThickness: null,
    flexhone: null,
    flexndi: false,
  };
  protected stepInputs: UpdateHoleStepInput[] = [];
  protected partInputs: UpdateHolePartInput[] = [];
  protected ndiInspectionDateInput = '';
  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const hole = await firstValueFrom(this.corrosionService.getHole(id));
    this.applyHole(hole);
  }

  canEditHole(): boolean {
    return this.permissions.canEditHole(this.auth.currentUser());
  }

  async saveCore(): Promise<void> {
    if (!this.canEditHole()) return;
    const h = this.hole();
    if (!h) return;
    this.form.ndiInspectionDate = this.fromDateInput(this.ndiInspectionDateInput);
    this.savingCore.set(true);
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHole(h.id, this.form));
      this.applyHole(updated);
      this.coreMessage.set('Opgeslagen');
      this.coreMessageType.set('success');
      this.toast.success('Kerngegevens opgeslagen');
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Kerngegevens opslaan mislukt');
      this.coreMessage.set(msg);
      this.coreMessageType.set('error');
      this.toast.error(msg);
    } finally {
      this.savingCore.set(false);
    }
  }

  async saveSteps(): Promise<void> {
    if (!this.canEditHole()) return;
    const h = this.hole();
    if (!h) return;
    const ids = this.stepInputs.map((s) => s.stepNo);
    if (new Set(ids).size !== ids.length) {
      this.stepsMessage.set('Dubbele step nummers');
      this.stepsMessageType.set('error');
      this.toast.error('Dubbele step nummers');
      return;
    }
    this.savingSteps.set(true);
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleSteps(h.id, this.stepInputs));
      this.applyHole(updated);
      this.stepsMessage.set('Steps opgeslagen');
      this.stepsMessageType.set('success');
      this.toast.success('Steps opgeslagen');
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Steps opslaan mislukt');
      this.stepsMessage.set(msg);
      this.stepsMessageType.set('error');
      this.toast.error(msg);
    } finally {
      this.savingSteps.set(false);
    }
  }

  async saveParts(): Promise<void> {
    if (!this.canEditHole()) return;
    const h = this.hole();
    if (!h) return;
    if (this.partInputs.some((p) => p.slotNo < 1 || p.slotNo > 4)) {
      this.partsMessage.set('Slot nummers moeten tussen 1 en 4 liggen');
      this.partsMessageType.set('error');
      this.toast.error('Slot nummers moeten tussen 1 en 4 liggen');
      return;
    }
    const ids = this.partInputs.map((p) => p.slotNo);
    if (new Set(ids).size !== ids.length) {
      this.partsMessage.set('Dubbele slot nummers');
      this.partsMessageType.set('error');
      this.toast.error('Dubbele slot nummers');
      return;
    }
    this.savingParts.set(true);
    try {
      const updated = await firstValueFrom(this.corrosionService.updateHoleParts(h.id, this.partInputs));
      this.applyHole(updated);
      this.partsMessage.set('Parts opgeslagen');
      this.partsMessageType.set('success');
      this.toast.success('Parts opgeslagen');
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Parts opslaan mislukt');
      this.partsMessage.set(msg);
      this.partsMessageType.set('error');
      this.toast.error(msg);
    } finally {
      this.savingParts.set(false);
    }
  }

  addStep(): void {
    if (!this.canEditHole()) return;
    this.stepInputs = [...this.stepInputs, { stepNo: this.stepInputs.length + 1, sizeValue: null, visualDamageCheck: null, reamFlag: null, mdrFlag: null, ndiFlag: null }];
  }

  removeStep(index: number): void {
    if (!this.canEditHole()) return;
    this.stepInputs = this.stepInputs.filter((_, i) => i !== index);
  }

  addPart(): void {
    if (!this.canEditHole()) return;
    if (this.partInputs.length >= 4) {
      this.toast.info('Maximaal 4 parts per hole.');
      return;
    }
    this.partInputs = [...this.partInputs, { slotNo: this.partInputs.length + 1, partNumber: null, partLength: null, bushingType: null, standardCustom: null, orderedFlag: null, deliveredFlag: null, status: null }];
  }

  removePart(index: number): void {
    if (!this.canEditHole()) return;
    this.partInputs = this.partInputs.filter((_, i) => i !== index);
  }

  private applyHole(hole: Hole): void {
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
      mdrResubmit: hole.mdrResubmit,
      totalStackupLength: hole.totalStackupLength,
      stackUp: hole.stackUp,
      sleeveBushings: hole.sleeveBushings,
      countersinked: hole.countersinked,
      clean: hole.clean,
      cutSleeveBushing: hole.cutSleeveBushing,
      installed: hole.installed,
      primer: hole.primer,
      surfaceCorrosion: hole.surfaceCorrosion,
      nutplateInspection: hole.nutplateInspection,
      nutplateSurfaceCorrosion: hole.nutplateSurfaceCorrosion,
      totalStructureThickness: hole.totalStructureThickness,
      flexhone: hole.flexhone,
      flexndi: hole.flexndi,
    };
    this.ndiInspectionDateInput = this.toDateInput(hole.ndiInspectionDate);
    this.stepInputs = hole.steps.map((s) => ({ stepNo: s.stepNo, sizeValue: s.sizeValue, visualDamageCheck: s.visualDamageCheck, reamFlag: s.reamFlag, mdrFlag: s.mdrFlag, ndiFlag: s.ndiFlag }));
    this.partInputs = hole.parts.map((p) => ({ slotNo: p.slotNo, partNumber: p.partNumber, partLength: p.partLength, bushingType: p.bushingType, standardCustom: p.standardCustom, orderedFlag: p.orderedFlag, deliveredFlag: p.deliveredFlag, status: p.status }));
  }

  private toDateInput(value: Date | null): string {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }

  private fromDateInput(value: string): Date | null {
    if (!value) return null;
    return new Date(`${value}T00:00:00`);
  }

  protected withCurrentOptions(options: string[], current: string | null | undefined): string[] {
    const normalized = options.map((x) => x.trim()).filter((x) => x.length > 0);
    if (!current || !current.trim()) return normalized;
    const value = current.trim();
    return normalized.includes(value) ? normalized : [value, ...normalized];
  }
}
