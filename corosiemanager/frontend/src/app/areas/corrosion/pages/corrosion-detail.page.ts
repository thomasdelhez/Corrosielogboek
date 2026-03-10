import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UpdateHoleInput, UpdateHolePartInput, UpdateHoleStepInput } from '../models/corrosion.inputs';
import { Hole } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-detail-page',
  imports: [FormsModule, PageHeaderComponent, StatusPillComponent, EmptyStateComponent],
  templateUrl: './corrosion-detail.page.html',
  styleUrl: './corrosion-detail.page.scss',
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
  protected readonly loadError = signal<string | null>(null);

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
    await this.reload();
  }

  async reload(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadError.set(null);
    try {
      const hole = await firstValueFrom(this.corrosionService.getHole(id));
      this.applyHole(hole);
    } catch (error) {
      const message = this.apiErrors.toUserMessage(error, 'Hole laden mislukt');
      this.loadError.set(message);
      this.toast.error(message);
    }
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
