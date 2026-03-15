import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { RoutingService } from '../../../core/services/routing.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UpdateHoleInput, UpdateHolePartInput, UpdateHoleStepInput } from '../models/corrosion.inputs';
import { Aircraft, Hole, HoleTrackerRow, InstallationTrackerRow, NdiQueueRow, OrderingTrackerRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type RepairLaneKey =
  | 'flexhone'
  | 'maxBp'
  | 'reaming'
  | 'ndiNeeded'
  | 'mdrNeeded'
  | 'mdrResubmit'
  | 'notOrdered'
  | 'notDelivered'
  | 'installationPhase'
  | 'installationFinished';

type RepairQueueItem = {
  holeId: number;
  holeNumber: number;
};

type RepairTabKey = 'sleeves' | 'machining' | 'status' | 'steps' | 'review' | 'queues';

@Component({
  selector: 'app-corrosion-repair-page',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './corrosion-repair.page.html',
  styleUrl: './corrosion-repair.page.scss',
})
export class CorrosionRepairPage implements OnInit {
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
  protected readonly holeTrackers = signal<HoleTrackerRow[]>([]);
  protected readonly ndiRows = signal<NdiQueueRow[]>([]);
  protected readonly orderingRows = signal<OrderingTrackerRow[]>([]);
  protected readonly installationRows = signal<InstallationTrackerRow[]>([]);
  protected readonly savingRepair = signal(false);
  protected readonly deletingHole = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeTab = signal<RepairTabKey>('machining');

  protected readonly dmgCleanOptions = ['CLEAN', 'DMG'];
  protected readonly fitOptions = ['STD', 'CST'];
  protected readonly bushingTypeOptions = ['SB', 'CS'];
  protected readonly stdCstOptions = ['STD', 'CST'];
  protected readonly sleeveBushingOptions = ['SB', 'CS'];
  protected readonly nutplateConditionOptions = ['CLEAN', 'DMG'];
  protected readonly nutplateTestOptions = ['PASS', 'FAIL'];
  protected readonly repairTabs: Array<{ key: RepairTabKey; label: string }> = [
    { key: 'machining', label: 'Machining' },
    { key: 'steps', label: 'Steps' },
    { key: 'sleeves', label: 'Sleeves / Bushings' },
    { key: 'review', label: 'MDR / NDI' },
    { key: 'status', label: 'Status' },
    { key: 'queues', label: 'Queues' },
  ];
  protected readonly repairLaneDefs: Array<{ key: RepairLaneKey; label: string; className: string }> = [
    { key: 'flexhone', label: 'FlexHone phase', className: 'lane-orange' },
    { key: 'maxBp', label: 'To Max B/P size', className: 'lane-cream' },
    { key: 'reaming', label: 'In reaming phase', className: 'lane-yellow' },
    { key: 'ndiNeeded', label: 'NDI needed', className: 'lane-blue' },
    { key: 'mdrNeeded', label: 'MDR needed', className: 'lane-red' },
    { key: 'mdrResubmit', label: 'MDR resubmit needed', className: 'lane-red-strong' },
    { key: 'notOrdered', label: 'Not yet ordered', className: 'lane-green' },
    { key: 'notDelivered', label: 'Not yet delivered', className: 'lane-green-light' },
    { key: 'installationPhase', label: 'Installation phase', className: 'lane-green-mid' },
    { key: 'installationFinished', label: 'Installation finished', className: 'lane-slate' },
  ];

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
  protected readonly workflowIndicator = computed(() => ({
    reviewOpen: !!(this.form.mdrNeeded || this.form.mdrResubmit || !this.form.ndiFinished),
    installationReady: !!(this.form.installed || this.orderingRows().some((row) => row.holeId === this.hole()?.id && row.installationReady)),
  }));
  protected readonly repairQueueColumns = computed<Record<RepairLaneKey, RepairQueueItem[]>>(() => ({
    flexhone: this.uniqueRepairItems(this.holeTrackers().filter((row) => row.queueStatus === 'flexhone')),
    maxBp: this.uniqueRepairItems(this.holeTrackers().filter((row) => row.queueStatus === 'max_bp')),
    reaming: this.uniqueRepairItems(this.holeTrackers().filter((row) => row.queueStatus === 'reaming_steps')),
    ndiNeeded: this.uniqueRepairItems(this.ndiRows().filter((row) => row.queueStatus !== 'finished')),
    mdrNeeded: this.uniqueRepairItems(this.panelHoles().filter((row) => row.mdrNeeded).map((row) => ({ holeId: row.id, holeNumber: row.holeNumber }))),
    mdrResubmit: this.uniqueRepairItems(this.panelHoles().filter((row) => row.mdrResubmit).map((row) => ({ holeId: row.id, holeNumber: row.holeNumber }))),
    notOrdered: this.uniqueRepairItems(this.orderingRows().filter((row) => row.orderNeeded)),
    notDelivered: this.uniqueRepairItems(this.orderingRows().filter((row) => row.deliveryInProgress)),
    installationPhase: this.uniqueRepairItems(this.installationRows().filter((row) => row.queueStatus === 'ready_for_installation')),
    installationFinished: this.uniqueRepairItems(this.installationRows().filter((row) => row.queueStatus === 'finished_installation')),
  }));

  async ngOnInit(): Promise<void> {
    this.activeTab.set((this.route.snapshot.queryParamMap.get('tab') as RepairTabKey) || 'machining');
    await this.reload();
  }

  async reload(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadError.set(null);
    try {
      const hole = await firstValueFrom(this.corrosionService.getHole(id));
      await this.applyHole(hole);
    } catch (error) {
      const message = this.apiErrors.toUserMessage(error, 'Hole repair laden mislukt');
      this.loadError.set(message);
      this.toast.error(message);
    }
  }

  canEditHole(): boolean {
    return this.permissions.canEditHole(this.auth.currentUser());
  }

  setActiveTab(tab: RepairTabKey): void {
    this.activeTab.set(tab);
  }

  async saveRepairWorkspace(): Promise<void> {
    if (!this.canEditHole()) return;
    const h = this.hole();
    if (!h) return;

    const stepPayload = this.normalizedStepInputs();
    const duplicateStepNumbers = stepPayload.map((step) => step.stepNo);
    if (new Set(duplicateStepNumbers).size !== duplicateStepNumbers.length) {
      this.toast.error('Dubbele stepnummers zijn niet toegestaan.');
      return;
    }

    this.form.ndiInspectionDate = this.fromDateInput(this.ndiInspectionDateInput);
    this.savingRepair.set(true);
    try {
      await firstValueFrom(this.corrosionService.updateHole(h.id, this.form));
      await firstValueFrom(this.corrosionService.updateHoleSteps(h.id, stepPayload));
      const updated = await firstValueFrom(this.corrosionService.updateHoleParts(h.id, this.normalizedPartInputs()));
      await this.applyHole(updated);
      this.toast.success('Repair opgeslagen');
    } catch (error) {
      this.toast.error(this.apiErrors.toUserMessage(error, 'Repair opslaan mislukt'));
    } finally {
      this.savingRepair.set(false);
    }
  }

  addStep(): void {
    if (!this.canEditHole()) return;
    const nextStepNo = Math.max(0, ...this.stepInputs.map((step) => step.stepNo)) + 1;
    this.stepInputs = [...this.stepInputs, this.blankStep(nextStepNo)];
  }

  removeStep(index: number): void {
    if (!this.canEditHole()) return;
    const remaining = this.stepInputs.filter((_, current) => current !== index);
    this.stepInputs = remaining.length > 0 ? remaining : [this.blankStep(1)];
  }

  async onSelectedHoleChange(value: string | number | null): Promise<void> {
    if (!value) return;
    await this.routing.goToCorrosionRepair(Number(value));
    await this.reload();
  }

  async goToPreviousHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index <= 0) return;
    await this.routing.goToCorrosionRepair(this.panelHoles()[index - 1].id);
    await this.reload();
  }

  async goToNextHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index < 0 || index >= this.panelHoles().length - 1) return;
    await this.routing.goToCorrosionRepair(this.panelHoles()[index + 1].id);
    await this.reload();
  }

  async deleteCurrentHole(): Promise<void> {
    const h = this.hole();
    if (!h || !this.canEditHole()) return;
    this.deletingHole.set(true);
    try {
      await firstValueFrom(this.corrosionService.deleteHole(h.id));
      this.toast.success('Hole verwijderd');
      await this.routing.goToCorrosionList('repair');
    } catch (error) {
      this.toast.error(this.apiErrors.toUserMessage(error, 'Hole verwijderen mislukt'));
    } finally {
      this.deletingHole.set(false);
    }
  }

  openInspectionWorkspace(): void {
    const currentHoleId = this.hole()?.id;
    if (!currentHoleId) return;
    void this.routing.goToCorrosionInspection(currentHoleId);
  }

  openRepairLaneHole(holeId: number): void {
    void this.onSelectedHoleChange(holeId);
  }

  protected withCurrentOptions(options: string[], current: string | null | undefined): string[] {
    const normalized = options.map((value) => value.trim()).filter((value) => value.length > 0);
    if (!current || !current.trim()) return normalized;
    const value = current.trim();
    return normalized.includes(value) ? normalized : [value, ...normalized];
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
      nutplateTest: hole.nutplateTest,
      totalStructureThickness: hole.totalStructureThickness,
      flexhone: hole.flexhone,
      flexndi: hole.flexndi,
      examplePart: hole.examplePart,
      cleanAlcoholAlodine: hole.cleanAlcoholAlodine,
    };
    this.ndiInspectionDateInput = this.toDateInput(hole.ndiInspectionDate);
    this.stepInputs = this.normalizedLoadedSteps(
      hole.steps.map((step) => ({
        stepNo: step.stepNo,
        sizeValue: step.sizeValue,
        visualDamageCheck: step.visualDamageCheck,
        reamFlag: step.reamFlag,
        mdrFlag: step.mdrFlag,
        ndiFlag: step.ndiFlag,
      })),
    );
    this.partInputs = this.normalizedLoadedParts(
      hole.parts.map((part) => ({
        slotNo: part.slotNo,
        partNumber: part.partNumber,
        partLength: part.partLength,
        bushingType: part.bushingType,
        standardCustom: part.standardCustom,
        orderedFlag: part.orderedFlag,
        deliveredFlag: part.deliveredFlag,
        status: part.status,
      })),
    );
    await this.loadContext(hole);
  }

  private async loadContext(hole: Hole): Promise<void> {
    const [panelHoles, panels, aircraft, holeTrackers, ndiRows, orderingRows, installationRows] = await Promise.all([
      firstValueFrom(this.corrosionService.listPanelHoles(hole.panelId)),
      firstValueFrom(this.corrosionService.listPanels()),
      firstValueFrom(this.corrosionService.listAircraft()),
      firstValueFrom(this.corrosionService.listHoleTrackers({ panelId: hole.panelId, queue: 'all' })),
      firstValueFrom(this.corrosionService.listNdiDashboard({ panelId: hole.panelId, queue: 'all' })),
      firstValueFrom(this.corrosionService.listOrderingTracker({ panelId: hole.panelId, queue: 'all' })),
      firstValueFrom(this.corrosionService.listInstallationTrackers({ panelId: hole.panelId, queue: 'all' })),
    ]);

    this.panelHoles.set(panelHoles.sort((a, b) => a.holeNumber - b.holeNumber));
    const panel = panels.find((entry) => entry.id === hole.panelId) ?? null;
    this.panel.set(panel);
    this.aircraft.set(panel ? aircraft.find((entry) => entry.id === panel.aircraftId) ?? null : null);
    this.holeTrackers.set(holeTrackers);
    this.ndiRows.set(ndiRows);
    this.orderingRows.set(orderingRows);
    this.installationRows.set(installationRows);
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

  private normalizedLoadedSteps(steps: UpdateHoleStepInput[]): UpdateHoleStepInput[] {
    const sorted = [...steps].sort((left, right) => left.stepNo - right.stepNo);
    return sorted.length > 0 ? sorted : [this.blankStep(1)];
  }

  private normalizedLoadedParts(parts: UpdateHolePartInput[]): UpdateHolePartInput[] {
    const bySlot = new Map(parts.map((part) => [part.slotNo, part]));
    const normalized: UpdateHolePartInput[] = [];
    for (let slotNo = 1; slotNo <= 4; slotNo += 1) {
      normalized.push(bySlot.get(slotNo) ?? this.blankPart(slotNo));
    }
    return normalized;
  }

  private normalizedStepInputs(): UpdateHoleStepInput[] {
    return this.stepInputs
      .map((step) => ({
        stepNo: Number(step.stepNo),
        sizeValue: step.sizeValue,
        visualDamageCheck: step.visualDamageCheck,
        reamFlag: step.reamFlag ?? false,
        mdrFlag: step.mdrFlag ?? false,
        ndiFlag: step.ndiFlag ?? false,
      }))
      .filter((step) => Number.isFinite(step.stepNo) && step.stepNo > 0)
      .filter((step) => step.sizeValue !== null || !!step.visualDamageCheck || !!step.reamFlag || !!step.mdrFlag || !!step.ndiFlag);
  }

  private normalizedPartInputs(): UpdateHolePartInput[] {
    return this.partInputs.map((part, index) => ({
      slotNo: index + 1,
      partNumber: part.partNumber?.trim() ? part.partNumber.trim() : null,
      partLength: part.partLength,
      bushingType: part.bushingType,
      standardCustom: part.standardCustom,
      orderedFlag: part.orderedFlag ?? false,
      deliveredFlag: part.deliveredFlag ?? false,
      status: part.status?.trim() ? part.status.trim() : null,
    }));
  }

  private blankStep(stepNo: number): UpdateHoleStepInput {
    return {
      stepNo,
      sizeValue: null,
      visualDamageCheck: null,
      reamFlag: false,
      mdrFlag: false,
      ndiFlag: false,
    };
  }

  private blankPart(slotNo: number): UpdateHolePartInput {
    return {
      slotNo,
      partNumber: null,
      partLength: null,
      bushingType: null,
      standardCustom: null,
      orderedFlag: false,
      deliveredFlag: false,
      status: null,
    };
  }

  private uniqueRepairItems(rows: Array<{ holeId: number; holeNumber: number }>): RepairQueueItem[] {
    const seen = new Set<number>();
    const items: RepairQueueItem[] = [];
    for (const row of rows) {
      if (seen.has(row.holeId)) continue;
      seen.add(row.holeId);
      items.push({ holeId: row.holeId, holeNumber: row.holeNumber });
    }
    return items.sort((left, right) => left.holeNumber - right.holeNumber);
  }
}
