import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { StatusPillComponent } from '../../../shared/components/status-pill.component';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AppUser, UserAuditEvent } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, DatePipe, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage implements OnInit {
  private readonly svc = inject(CorrosionService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly users = signal<AppUser[]>([]);
  protected readonly auditEvents = signal<UserAuditEvent[]>([]);
  protected readonly roleDrafts = signal<Record<number, 'engineer' | 'reviewer' | 'admin'>>({});
  protected readonly activeDrafts = signal<Record<number, boolean>>({});
  protected readonly busyRows = signal<Record<number, boolean>>({});
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly roles: Array<'engineer' | 'reviewer' | 'admin'> = ['engineer', 'reviewer', 'admin'];
  protected readonly auditActionOptions = ['create', 'update_role', 'set_active', 'delete', 'update_self'];

  protected newUsername = '';
  protected newPassword = '';
  protected newRole: 'engineer' | 'reviewer' | 'admin' = 'engineer';
  protected auditAction = '';
  protected auditUsername = '';
  protected auditDateFrom = '';
  protected auditDateTo = '';
  protected auditLimit = 150;
  private auditFilterTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async createUser(): Promise<void> {
    if (!this.newUsername.trim() || !this.newPassword) {
      this.toast.info('Vul username en password in.');
      return;
    }
    try {
      await firstValueFrom(
        this.svc.createUser({
          username: this.newUsername.trim(),
          password: this.newPassword,
          role: this.newRole,
          isActive: true,
        }),
      );
      this.newUsername = '';
      this.newPassword = '';
      this.newRole = 'engineer';
      this.toast.success('User aangemaakt.');
      await this.reload();
    } catch (e: unknown) {
      this.toast.error(this.apiErrors.toUserMessage(e, 'User aanmaken mislukt'));
    }
  }

  setRoleDraft(userId: number, role: 'engineer' | 'reviewer' | 'admin'): void {
    this.roleDrafts.update((d) => ({ ...d, [userId]: role }));
  }

  setActiveDraft(userId: number, isActive: boolean): void {
    this.activeDrafts.update((d) => ({ ...d, [userId]: isActive }));
  }

  roleDraft(user: AppUser): 'engineer' | 'reviewer' | 'admin' {
    return this.roleDrafts()[user.id] || user.role;
  }

  activeDraft(user: AppUser): boolean {
    return this.activeDrafts()[user.id] ?? user.isActive;
  }

  isRowBusy(userId: number): boolean {
    return !!this.busyRows()[userId];
  }

  hasRowChanges(user: AppUser): boolean {
    const nextRole = this.roleDrafts()[user.id] ?? user.role;
    const nextActive = this.activeDrafts()[user.id] ?? user.isActive;
    return nextRole !== user.role || nextActive !== user.isActive;
  }

  async saveUserChanges(user: AppUser): Promise<void> {
    const nextRole = this.roleDrafts()[user.id] ?? user.role;
    const nextActive = this.activeDrafts()[user.id] ?? user.isActive;
    const roleChanged = nextRole !== user.role;
    const activeChanged = nextActive !== user.isActive;
    if (!roleChanged && !activeChanged) {
      this.toast.info('Geen wijzigingen om op te slaan.');
      return;
    }

    const previousRole = user.role;
    const previousActive = user.isActive;
    this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, role: nextRole, isActive: nextActive } : r)));
    this.busyRows.update((rows) => ({ ...rows, [user.id]: true }));
    try {
      let updated = user;
      if (roleChanged) {
        updated = await firstValueFrom(this.svc.updateUserRole(user.id, nextRole));
      }
      if (activeChanged) {
        updated = await firstValueFrom(this.svc.setUserActive(user.id, nextActive));
      }
      this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, ...updated } : r)));
      this.roleDrafts.update((drafts) => ({ ...drafts, [user.id]: updated.role }));
      this.activeDrafts.update((drafts) => ({ ...drafts, [user.id]: updated.isActive }));
      this.toast.success('Gebruiker bijgewerkt.');
      await this.loadAuditEvents();
    } catch (e: unknown) {
      this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, role: previousRole, isActive: previousActive } : r)));
      this.roleDrafts.update((drafts) => ({ ...drafts, [user.id]: previousRole }));
      this.activeDrafts.update((drafts) => ({ ...drafts, [user.id]: previousActive }));
      this.toast.error(this.apiErrors.toUserMessage(e, 'Gebruiker bijwerken mislukt'));
    } finally {
      this.busyRows.update((rows) => ({ ...rows, [user.id]: false }));
    }
  }

  async deleteUser(user: AppUser): Promise<void> {
    if (!confirm(`User ${user.username} verwijderen?`)) return;
    this.busyRows.update((rows) => ({ ...rows, [user.id]: true }));
    try {
      await firstValueFrom(this.svc.deleteUser(user.id));
      this.toast.success(`User ${user.username} verwijderd.`);
      await this.reload();
    } catch (e: unknown) {
      this.toast.error(this.apiErrors.toUserMessage(e, 'User verwijderen mislukt'));
    } finally {
      this.busyRows.update((rows) => ({ ...rows, [user.id]: false }));
    }
  }

  onAuditFilterChange(): void {
    if (this.auditFilterTimer) {
      clearTimeout(this.auditFilterTimer);
    }
    this.auditFilterTimer = setTimeout(() => {
      this.auditFilterTimer = null;
      void this.loadAuditEvents();
    }, 250);
  }

  async resetAuditFilters(): Promise<void> {
    this.auditAction = '';
    this.auditUsername = '';
    this.auditDateFrom = '';
    this.auditDateTo = '';
    this.auditLimit = 150;
    await this.loadAuditEvents();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const rows = await firstValueFrom(this.svc.listUsers());
      this.users.set(rows);
      this.roleDrafts.set(Object.fromEntries(rows.map((u) => [u.id, u.role])) as Record<number, 'engineer' | 'reviewer' | 'admin'>);
      this.activeDrafts.set(Object.fromEntries(rows.map((u) => [u.id, u.isActive])) as Record<number, boolean>);
      await this.loadAuditEvents();
    } catch (e: unknown) {
      this.loadError.set(this.apiErrors.toUserMessage(e, 'Gebruikersbeheer laden mislukt'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAuditEvents(): Promise<void> {
    const auditEvents = await firstValueFrom(
      this.svc.listUserAuditEvents({
        action: this.auditAction.trim() || null,
        username: this.auditUsername.trim() || null,
        dateFrom: this.auditDateFrom ? new Date(this.auditDateFrom) : null,
        dateTo: this.auditDateTo ? new Date(this.auditDateTo) : null,
        limit: Math.max(1, Math.min(500, Number(this.auditLimit) || 150)),
      }),
    );
    this.auditEvents.set(auditEvents);
  }
}
