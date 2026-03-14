import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RoutingService } from '../../../core/services/routing.service';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UpdateHoleInput, UpdateHolePartInput, UpdateHoleStepInput } from '../models/corrosion.inputs';
import { Aircraft, Hole, InspectionQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-corrosion-detail-page',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './corrosion-detail.page.html',
  styleUrl: './corrosion-detail.page.scss',
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly routing = inject(RoutingService);
  private readonly corrosionService = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

  protected readonly hole = signal<Hole | null>(null);
  protected readonly aircraft = signal<Aircraft | null>(null);
  protected readonly panel = signal<PanelSummary | null>(null);
  protected readonly panelHoles = signal<Hole[]>([]);
  protected readonly inspectionRows = signal<InspectionQueueRow[]>([]);
  protected readonly coreMessage = signal('');
  protected readonly partsMessage = signal('');
  protected readonly coreMessageType = signal<'success' | 'error' | 'info'>('info');
  protected readonly partsMessageType = signal<'success' | 'error' | 'info'>('info');

  protected readonly savingCore = signal(false);
  protected readonly savingParts = signal(false);
  protected readonly deletingHole = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeWorkspace = signal<'inspection' | 'repair' | 'parts'>('inspection');

  protected readonly inspectionStatusOptions = ['To be inspected', 'Rifled', 'Corroded', 'Clean'];
  protected readonly partStatusOptions = ['Open', 'In Progress @EST', 'Ordered @981', 'Received @LSE', 'Delivered @Floor', 'Closed'];
  protected readonly dmgCleanOptions = ['CLEAN', 'DMG'];
  protected readonly bushingTypeOptions = ['SB', 'CS'];
  protected readonly stdCstOptions = ['STD', 'CST'];
  protected readonly sleeveBushingOptions = ['SB', 'CS'];
  protected readonly nutplateConditionOptions = ['CLEAN', 'DMG'];
  protected readonly nutplateTestOptions = ['PASS', 'FAIL'];

  protected form: UpdateHoleInput = {
    maxBpDiameter: null,
    bpDamageClean: null,
    finalHoleSize: null,
    fit: null,
    reamMaxBp: false,
    mdrCode: null,
    mdrNeeded: false,
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
    nutplateTest: null,
    totalStructureThickness: null,
    flexhone: null,
    flexndi: false,
    examplePart: null,
    cleanAlcoholAlodine: false,
  };
  protected stepInputs: UpdateHoleStepInput[] = [];
  protected partInputs: UpdateHolePartInput[] = [];
  protected ndiInspectionDateInput = '';
  protected readonly selectedHoleId = computed(() => this.hole()?.id ?? null);
  protected readonly canGoPrevious = computed(() => this.currentHoleIndex() > 0);
  protected readonly canGoNext = computed(() => {
    const index = this.currentHoleIndex();
    return index >= 0 && index < this.panelHoles().length - 1;
  });
  protected readonly queueColumns = computed(() => ({
    toBeInspected: this.inspectionRows().filter((row) => row.queueStatus === 'to_be_inspected'),
    markedAsRifled: this.inspectionRows().filter((row) => row.queueStatus === 'marked_as_rifled'),
    markedAsCorroded: this.inspectionRows().filter((row) => row.queueStatus === 'marked_as_corroded'),
    markedAsClean: this.inspectionRows().filter((row) => row.queueStatus === 'marked_as_clean'),
  }));

  async ngOnInit(): Promise<void> {
    const workspaceParam = this.route.snapshot.queryParamMap.get('workspace');
    this.activeWorkspace.set(workspaceParam === 'repair' ? 'repair' : 'inspection');
    await this.reload();
  }

  async reload(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadError.set(null);
    try {
      const hole = await firstValueFrom(this.corrosionService.getHole(id));
      await this.applyHole(hole);
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
      await this.applyHole(updated);
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
      await this.applyHole(updated);
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

  async onSelectedHoleChange(value: string | number | null): Promise<void> {
    if (!value) return;
    await this.routing.goToCorrosionDetail(Number(value), this.routeWorkspace());
    await this.reload();
  }

  async goToPreviousHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index <= 0) return;
    await this.routing.goToCorrosionDetail(this.panelHoles()[index - 1].id, this.routeWorkspace());
    await this.reload();
  }

  async goToNextHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index < 0 || index >= this.panelHoles().length - 1) return;
    await this.routing.goToCorrosionDetail(this.panelHoles()[index + 1].id, this.routeWorkspace());
    await this.reload();
  }

  async deleteCurrentHole(): Promise<void> {
    const h = this.hole();
    if (!h || !this.canEditHole()) return;
    this.deletingHole.set(true);
    try {
      await firstValueFrom(this.corrosionService.deleteHole(h.id));
      this.toast.success('Hole verwijderd');
      await this.routing.goToCorrosionList();
    } catch (error) {
      this.toast.error(this.apiErrors.toUserMessage(error, 'Hole verwijderen mislukt'));
    } finally {
      this.deletingHole.set(false);
    }
  }

  private async applyHole(hole: Hole): Promise<void> {
    this.hole.set(hole);
    this.form = {
      maxBpDiameter: hole.maxBpDiameter,
      bpDamageClean: hole.bpDamageClean,
      finalHoleSize: hole.finalHoleSize,
      fit: hole.fit,
      reamMaxBp: hole.reamMaxBp,
      mdrCode: hole.mdrCode,
      mdrNeeded: hole.mdrNeeded,
      mdrVersion: hole.mdrVersion,
      ndiNameInitials: hole.ndiNameInitials,
      ndiInspectionDate: hole.ndiInspectionDate,
      ndiFinished: hole.ndiFinished,
      inspectionStatus: this.normalizeInspectionStatus(hole.inspectionStatus),
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
      nutplateTest: hole.nutplateTest,
      totalStructureThickness: hole.totalStructureThickness,
      flexhone: hole.flexhone,
      flexndi: hole.flexndi,
      examplePart: hole.examplePart,
      cleanAlcoholAlodine: hole.cleanAlcoholAlodine,
    };
    this.ndiInspectionDateInput = this.toDateInput(hole.ndiInspectionDate);
    this.stepInputs = hole.steps.map((s) => ({ stepNo: s.stepNo, sizeValue: s.sizeValue, visualDamageCheck: s.visualDamageCheck, reamFlag: s.reamFlag, mdrFlag: s.mdrFlag, ndiFlag: s.ndiFlag }));
    this.partInputs = hole.parts.map((p) => ({ slotNo: p.slotNo, partNumber: p.partNumber, partLength: p.partLength, bushingType: p.bushingType, standardCustom: p.standardCustom, orderedFlag: p.orderedFlag, deliveredFlag: p.deliveredFlag, status: p.status }));
    await this.loadContext(hole);
  }

  private async loadContext(hole: Hole): Promise<void> {
    const [panelHoles, panels, aircraft, inspectionRows] = await Promise.all([
      firstValueFrom(this.corrosionService.listPanelHoles(hole.panelId)),
      firstValueFrom(this.corrosionService.listPanels()),
      firstValueFrom(this.corrosionService.listAircraft()),
      firstValueFrom(this.corrosionService.listInspectionDashboard({ panelId: hole.panelId, queue: 'all' })),
    ]);

    this.panelHoles.set(panelHoles.sort((a, b) => a.holeNumber - b.holeNumber));
    const panel = panels.find((entry) => entry.id === hole.panelId) ?? null;
    this.panel.set(panel);
    this.aircraft.set(panel ? aircraft.find((entry) => entry.id === panel.aircraftId) ?? null : null);
    this.inspectionRows.set(inspectionRows);
  }

  protected currentHoleIndex(): number {
    const id = this.hole()?.id;
    if (!id) return -1;
    return this.panelHoles().findIndex((entry) => entry.id === id);
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

  protected partSummary(flag: 'orderedFlag' | 'deliveredFlag'): number {
    return this.partInputs.filter((part) => !!part[flag]).length;
  }

  protected workspaceTabs(): Array<{ id: 'inspection' | 'repair' | 'parts'; label: string }> {
    return [
      { id: 'inspection', label: 'Inspection' },
      { id: 'repair', label: 'Repair' },
      { id: 'parts', label: 'Parts' },
    ];
  }

  protected queueColumnTitle(queue: 'to_be_inspected' | 'marked_as_rifled' | 'marked_as_corroded' | 'marked_as_clean'): string {
    if (queue === 'to_be_inspected') return 'To be inspected';
    if (queue === 'marked_as_rifled') return 'Marked as rifled';
    if (queue === 'marked_as_corroded') return 'Marked as corroded';
    return 'Marked as clean';
  }

  private normalizeInspectionStatus(status: string | null): string | null {
    const value = (status ?? '').trim().toLowerCase();
    if (!value || value === 'open' || value === 'in progress' || value === 'closed') {
      return 'To be inspected';
    }
    if (value === 'markedasrifled' || value === 'marked as rifled') {
      return 'Rifled';
    }
    if (value === 'markedascorroded' || value === 'marked as corroded') {
      return 'Corroded';
    }
    if (value === 'markedasclean' || value === 'marked as clean') {
      return 'Clean';
    }
    if (value === 'rifled') return 'Rifled';
    if (value === 'corroded') return 'Corroded';
    if (value === 'clean') return 'Clean';
    if (value === 'to be inspected') return 'To be inspected';
    return status;
  }

  private routeWorkspace(): 'inspection' | 'repair' {
    return this.activeWorkspace() === 'repair' ? 'repair' : 'inspection';
  }
}
