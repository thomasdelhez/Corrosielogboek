import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/security/services/authentication.service';
import { PermissionService } from '../../../core/security/services/permission.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Aircraft, NdiQueueRow, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

type NdiQueue = 'all' | 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';

@Component({
  selector: 'app-ndi-reports-page',
  imports: [FormsModule, RouterLink, DatePipe, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  templateUrl: './ndi-reports.page.html',
  styleUrl: './ndi-reports.page.scss',
})
export class NdiReportsPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly rows = signal<NdiQueueRow[]>([]);
  protected readonly allRows = signal<NdiQueueRow[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly queue = signal<NdiQueue>('all');
  protected readonly search = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly message = signal<string>('');
  protected readonly messageType = signal<'success' | 'error' | 'info'>('info');

  protected readonly checkCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'check_tracker').length);
  protected readonly actionCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'action_needed').length);
  protected readonly reportCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'report_needed').length);
  protected readonly finishedCount = computed(() => this.allRows().filter((x) => x.queueStatus === 'finished').length);

  async ngOnInit(): Promise<void> {
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    } else {
      await this.reload();
    }
  }

  async onAircraftChange(id: number): Promise<void> {
    this.selectedAircraftId.set(Number(id));
    this.panels.set(await firstValueFrom(this.svc.listPanels(Number(id))));
    this.selectedPanelId.set(null);
    await this.reload();
  }

  async onPanelChange(id: number | null): Promise<void> {
    this.selectedPanelId.set(id === null ? null : Number(id));
    await this.reload();
  }

  async setQueue(queue: NdiQueue): Promise<void> {
    this.queue.set(queue);
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const filters = {
      aircraftId: this.selectedAircraftId(),
      panelId: this.selectedPanelId(),
      q: this.search().trim() || null,
    };
    try {
      const [allRows, rows] = await Promise.all([
        firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: 'all' })),
        firstValueFrom(this.svc.listNdiDashboard({ ...filters, queue: this.queue() })),
      ]);

      this.allRows.set(allRows);
      this.rows.set(rows);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'NDI dashboard laden mislukt');
      this.loadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  queueLabel(queue: NdiQueueRow['queueStatus']): string {
    if (queue === 'check_tracker') return 'Check tracker';
    if (queue === 'action_needed') return 'Action needed';
    if (queue === 'report_needed') return 'Report needed';
    return 'Finished';
  }

  canTransitionNdi(): boolean {
    return this.permissions.canNdiTransition(this.auth.currentUser());
  }

  canCreateNdiReport(): boolean {
    return this.permissions.canNdiReportCreate(this.auth.currentUser());
  }

  async transition(holeId: number, toStatus: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished'): Promise<void> {
    if (!this.canTransitionNdi()) return;
    try {
      await firstValueFrom(this.svc.transitionNdiStatus(holeId, toStatus));
      this.message.set(`NDI status bijgewerkt: ${this.queueLabel(toStatus)}`);
      this.messageType.set('success');
      this.toast.success(`NDI status bijgewerkt: ${this.queueLabel(toStatus)}`);
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'NDI status update mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }

  async quickAddReport(holeId: number, panelId: number): Promise<void> {
    if (!this.canCreateNdiReport()) return;
    try {
      await firstValueFrom(
        this.svc.createNdiReport(holeId, {
          panelId,
          nameInitials: 'TBD',
          inspectionDate: new Date(),
          method: 'VT',
          tools: null,
          corrosionPosition: null,
        }),
      );
      this.message.set('Quick NDI report toegevoegd (VT/TBD).');
      this.messageType.set('success');
      this.toast.success('Quick NDI report toegevoegd (VT/TBD).');
      await this.reload();
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Quick report mislukt');
      this.message.set(msg);
      this.messageType.set('error');
      this.toast.error(msg);
    }
  }
}
