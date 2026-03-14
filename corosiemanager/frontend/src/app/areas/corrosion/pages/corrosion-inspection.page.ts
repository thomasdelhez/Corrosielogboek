import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
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
import { UpdateHoleInput } from '../models/corrosion.inputs';
import { Aircraft, Hole, InspectionQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type InspectionQueueKey = 'to_be_inspected' | 'marked_as_rifled' | 'marked_as_corroded' | 'marked_as_clean';
type InspectionStatusValue = 'To be inspected' | 'Rifled' | 'Corroded' | 'Clean';
type PendingInspectionMove = {
  row: InspectionQueueRow;
  targetQueue: InspectionQueueKey;
  targetStatus: InspectionStatusValue;
};

@Component({
  selector: 'app-corrosion-inspection-page',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './corrosion-inspection.page.html',
  styleUrl: './corrosion-inspection.page.scss',
})
export class CorrosionInspectionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly routing = inject(RoutingService);
  private readonly corrosionService = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);
  private inspectionAutosaveTimer: number | null = null;
  private suppressInspectionAutosave = false;

  protected readonly hole = signal<Hole | null>(null);
  protected readonly aircraft = signal<Aircraft | null>(null);
  protected readonly panel = signal<PanelSummary | null>(null);
  protected readonly panelHoles = signal<Hole[]>([]);
  protected readonly inspectionRows = signal<InspectionQueueRow[]>([]);
  protected readonly savingCore = signal(false);
  protected readonly deletingHole = signal(false);
  protected readonly draggingHoleId = signal<number | null>(null);
  protected readonly savingDraggedHoleId = signal<number | null>(null);
  protected readonly pendingInspectionMove = signal<PendingInspectionMove | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly inspectionStatusOptions: InspectionStatusValue[] = ['To be inspected', 'Rifled', 'Corroded', 'Clean'];
  protected readonly inspectionQueueListIds: Record<InspectionQueueKey, string> = {
    to_be_inspected: 'inspection-queue-to-be-inspected',
    marked_as_rifled: 'inspection-queue-rifled',
    marked_as_corroded: 'inspection-queue-corroded',
    marked_as_clean: 'inspection-queue-clean',
  };

  protected form: UpdateHoleInput = {
    inspectionStatus: null,
    clean: false,
  };

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

  protected onInspectionFieldChange(): void {
    if (this.suppressInspectionAutosave || !this.canEditHole()) return;
    if (this.inspectionAutosaveTimer !== null) {
      window.clearTimeout(this.inspectionAutosaveTimer);
    }
    this.inspectionAutosaveTimer = window.setTimeout(() => {
      this.inspectionAutosaveTimer = null;
      void this.saveInspectionFields();
    }, 150);
  }

  async onSelectedHoleChange(value: string | number | null): Promise<void> {
    if (!value) return;
    await this.routing.goToCorrosionInspection(Number(value));
    await this.reload();
  }

  async goToPreviousHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index <= 0) return;
    await this.routing.goToCorrosionInspection(this.panelHoles()[index - 1].id);
    await this.reload();
  }

  async goToNextHole(): Promise<void> {
    const index = this.currentHoleIndex();
    if (index < 0 || index >= this.panelHoles().length - 1) return;
    await this.routing.goToCorrosionInspection(this.panelHoles()[index + 1].id);
    await this.reload();
  }

  async deleteCurrentHole(): Promise<void> {
    const h = this.hole();
    if (!h || !this.canEditHole()) return;
    this.deletingHole.set(true);
    try {
      await firstValueFrom(this.corrosionService.deleteHole(h.id));
      this.toast.success('Hole verwijderd');
      await this.routing.goToCorrosionList('inspection');
    } catch (error) {
      this.toast.error(this.apiErrors.toUserMessage(error, 'Hole verwijderen mislukt'));
    } finally {
      this.deletingHole.set(false);
    }
  }

  protected onQueueDragStarted(holeId: number): void {
    this.draggingHoleId.set(holeId);
  }

  protected onQueueDragEnded(): void {
    this.draggingHoleId.set(null);
  }

  protected onInspectionQueueDrop(event: CdkDragDrop<InspectionQueueRow[]>, targetQueue: InspectionQueueKey): void {
    const row = event.item.data as InspectionQueueRow | undefined;
    if (!row || !this.canEditHole()) return;
    if (row.queueStatus === targetQueue) return;
    this.draggingHoleId.set(null);
    this.pendingInspectionMove.set({
      row,
      targetQueue,
      targetStatus: this.statusForQueue(targetQueue),
    });
  }

  protected cancelPendingInspectionMove(): void {
    if (this.savingDraggedHoleId()) return;
    this.pendingInspectionMove.set(null);
  }

  protected async confirmPendingInspectionMove(cleanedWithBrushAndAlcohol: boolean): Promise<void> {
    const pendingMove = this.pendingInspectionMove();
    if (!pendingMove) return;

    const { row, targetQueue, targetStatus } = pendingMove;
    const previousRows = this.inspectionRows();
    const previousHole = this.hole();
    const previousStatus = previousHole?.id === row.holeId ? previousHole.inspectionStatus : null;
    const previousClean = previousHole?.id === row.holeId ? previousHole.clean : null;

    this.pendingInspectionMove.set(null);
    this.savingDraggedHoleId.set(row.holeId);
    this.inspectionRows.set(this.patchInspectionRows(row.holeId, targetQueue));

    if (previousHole?.id === row.holeId) {
      this.hole.set({ ...previousHole, inspectionStatus: targetStatus, clean: cleanedWithBrushAndAlcohol });
      this.form.inspectionStatus = targetStatus;
      this.form.clean = cleanedWithBrushAndAlcohol;
    }

    try {
      const updated = await firstValueFrom(
        this.corrosionService.updateHole(row.holeId, {
          inspectionStatus: targetStatus,
          clean: cleanedWithBrushAndAlcohol,
        })
      );
      if (previousHole?.id === row.holeId) {
        this.hole.set(updated);
        this.form.inspectionStatus = this.normalizeInspectionStatus(updated.inspectionStatus);
        this.form.clean = updated.clean;
      }
      this.inspectionRows.set(this.patchInspectionRows(row.holeId, this.queueForStatus(updated.inspectionStatus)));
      this.toast.success(`Hole ${row.holeNumber} verplaatst naar ${targetStatus.toLowerCase()}`);
    } catch (error) {
      this.inspectionRows.set(previousRows);
      if (previousHole?.id === row.holeId && previousHole) {
        this.hole.set({ ...previousHole, inspectionStatus: previousStatus, clean: previousClean ?? previousHole.clean });
        this.form.inspectionStatus = this.normalizeInspectionStatus(previousStatus);
        this.form.clean = previousClean ?? previousHole.clean;
      }
      this.toast.error(this.apiErrors.toUserMessage(error, 'Sleepactie opslaan mislukt'));
    } finally {
      this.savingDraggedHoleId.set(null);
    }
  }

  protected connectedInspectionQueues(queue: InspectionQueueKey): string[] {
    return Object.entries(this.inspectionQueueListIds)
      .filter(([key]) => key !== queue)
      .map(([, id]) => id);
  }

  protected queueColumnTitle(queue: InspectionQueueKey): string {
    if (queue === 'to_be_inspected') return 'To be inspected';
    if (queue === 'marked_as_rifled') return 'Marked as rifled';
    if (queue === 'marked_as_corroded') return 'Marked as corroded';
    return 'Marked as clean';
  }

  private async saveInspectionFields(): Promise<void> {
    const h = this.hole();
    if (!h || !this.canEditHole()) return;

    const nextStatus = this.normalizeInspectionStatus(this.form.inspectionStatus ?? null);
    const nextClean = !!this.form.clean;
    const previousStatus = h.inspectionStatus;
    const previousClean = h.clean;
    const previousRows = this.inspectionRows();

    this.savingCore.set(true);
    this.hole.set({ ...h, inspectionStatus: nextStatus, clean: nextClean });
    this.inspectionRows.set(this.patchInspectionRows(h.id, this.queueForStatus(nextStatus)));

    try {
      const updated = await firstValueFrom(
        this.corrosionService.updateHole(h.id, {
          inspectionStatus: nextStatus,
          clean: nextClean,
        })
      );
      this.suppressInspectionAutosave = true;
      this.hole.set(updated);
      this.form.inspectionStatus = this.normalizeInspectionStatus(updated.inspectionStatus);
      this.form.clean = updated.clean;
      this.inspectionRows.set(this.patchInspectionRows(h.id, this.queueForStatus(updated.inspectionStatus)));
      this.suppressInspectionAutosave = false;
      this.toast.success('Inspection opgeslagen');
    } catch (error) {
      this.hole.set({ ...h, inspectionStatus: previousStatus, clean: previousClean });
      this.form.inspectionStatus = this.normalizeInspectionStatus(previousStatus);
      this.form.clean = previousClean;
      this.inspectionRows.set(previousRows);
      this.toast.error(this.apiErrors.toUserMessage(error, 'Inspection automatisch opslaan mislukt'));
    } finally {
      this.savingCore.set(false);
    }
  }

  private async applyHole(hole: Hole): Promise<void> {
    this.hole.set(hole);
    this.suppressInspectionAutosave = true;
    this.form = {
      inspectionStatus: this.normalizeInspectionStatus(hole.inspectionStatus),
      clean: hole.clean,
    };
    this.suppressInspectionAutosave = false;
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

  private patchInspectionRows(holeId: number, queueStatus: InspectionQueueKey): InspectionQueueRow[] {
    return this.inspectionRows().map((row) =>
      row.holeId === holeId
        ? {
            ...row,
            queueStatus,
            inspectionStatus: this.statusForQueue(queueStatus),
          }
        : row
    );
  }

  private statusForQueue(queue: InspectionQueueKey): InspectionStatusValue {
    if (queue === 'marked_as_rifled') return 'Rifled';
    if (queue === 'marked_as_corroded') return 'Corroded';
    if (queue === 'marked_as_clean') return 'Clean';
    return 'To be inspected';
  }

  private queueForStatus(status: string | null): InspectionQueueKey {
    const normalized = this.normalizeInspectionStatus(status);
    if (normalized === 'Rifled') return 'marked_as_rifled';
    if (normalized === 'Corroded') return 'marked_as_corroded';
    if (normalized === 'Clean') return 'marked_as_clean';
    return 'to_be_inspected';
  }

  private normalizeInspectionStatus(status: string | null): InspectionStatusValue {
    const value = (status ?? '').trim().toLowerCase();
    if (!value || value === 'open' || value === 'in progress' || value === 'closed') return 'To be inspected';
    if (value === 'markedasrifled' || value === 'marked as rifled' || value === 'rifled') return 'Rifled';
    if (value === 'markedascorroded' || value === 'marked as corroded' || value === 'corroded') return 'Corroded';
    if (value === 'markedasclean' || value === 'marked as clean' || value === 'clean') return 'Clean';
    return 'To be inspected';
  }
}
