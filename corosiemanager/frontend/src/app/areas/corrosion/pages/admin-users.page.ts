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
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Beheer"
            title="Gebruikersbeheer"
            subtitle="Beheer accounts, rollen en activatie zonder losse beheerflows of onduidelijke tabelacties."
          />

          @if (loadError()) {
            <div class="ui-banner error">
              <span>{{ loadError() }}</span>
              <button class="ui-btn-secondary" type="button" (click)="reload()">Opnieuw proberen</button>
            </div>
          }

          <section class="ui-filter-grid">
            <article class="ui-section">
              <div class="ui-section-inner ui-stack-md">
                <p class="ui-filter-label">Nieuwe user</p>
                <div class="ui-form-grid">
                  <label class="ui-field">
                    <span>Username</span>
                    <input [(ngModel)]="newUsername" />
                  </label>
                  <label class="ui-field">
                    <span>Password</span>
                    <input [(ngModel)]="newPassword" type="password" />
                  </label>
                  <label class="ui-field full">
                    <span>Rol</span>
                    <select [(ngModel)]="newRole">
                      @for (role of roles; track role) {
                        <option [value]="role">{{ role }}</option>
                      }
                    </select>
                  </label>
                </div>
                <div class="ui-actions">
                  <button class="ui-btn" type="button" (click)="createUser()">User aanmaken</button>
                </div>
              </div>
            </article>

            <article class="ui-section">
              <div class="ui-section-inner ui-stack-md">
                <p class="ui-filter-label">Audit filters</p>
                <div class="ui-form-grid">
                  <label class="ui-field">
                    <span>Actie</span>
                    <select [(ngModel)]="auditAction" (ngModelChange)="onAuditFilterChange()">
                      <option value="">Alle acties</option>
                      @for (action of auditActionOptions; track action) {
                        <option [value]="action">{{ action }}</option>
                      }
                    </select>
                  </label>
                  <label class="ui-field">
                    <span>Gebruiker</span>
                    <input [(ngModel)]="auditUsername" (ngModelChange)="onAuditFilterChange()" placeholder="admin" />
                  </label>
                  <label class="ui-field">
                    <span>Van datum</span>
                    <input [(ngModel)]="auditDateFrom" (ngModelChange)="onAuditFilterChange()" type="datetime-local" />
                  </label>
                  <label class="ui-field">
                    <span>Tot datum</span>
                    <input [(ngModel)]="auditDateTo" (ngModelChange)="onAuditFilterChange()" type="datetime-local" />
                  </label>
                  <label class="ui-field full">
                    <span>Max regels</span>
                    <input [(ngModel)]="auditLimit" (ngModelChange)="onAuditFilterChange()" type="number" min="1" max="500" />
                  </label>
                </div>
                <div class="ui-actions">
                  <button class="ui-btn-secondary" type="button" (click)="resetAuditFilters()">Reset filters</button>
                </div>
              </div>
            </article>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              <app-page-header title="Bestaande users" subtitle="Wijzig rollen en activatie direct in het overzicht." />

              @if (loading()) {
                <div class="ui-banner info"><span>Users laden...</span></div>
              } @else if (users().length === 0) {
                <app-empty-state
                  eyebrow="Geen users"
                  title="Nog geen users gevonden"
                  description="Maak hierboven de eerste gebruiker aan of laad de pagina opnieuw."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Rol</th>
                        <th>Status</th>
                        <th>Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (user of users(); track user.id) {
                        <tr>
                          <td>{{ user.id }}</td>
                          <td>{{ user.username }}</td>
                          <td class="form-cell">
                            <label class="table-field">
                              <span class="table-label">Rol</span>
                              <select [ngModel]="roleDraft(user)" (ngModelChange)="setRoleDraft(user.id, $event)">
                                @for (role of roles; track role) {
                                  <option [value]="role">{{ role }}</option>
                                }
                              </select>
                            </label>
                          </td>
                          <td class="form-cell">
                            <label class="table-field">
                              <span class="table-label">Actief</span>
                              <select [ngModel]="activeDraft(user)" (ngModelChange)="setActiveDraft(user.id, $event)">
                                <option [ngValue]="true">Ja</option>
                                <option [ngValue]="false">Nee</option>
                              </select>
                            </label>
                          </td>
                          <td>
                            <div class="ui-actions row-actions">
                              <button class="ui-btn-secondary" type="button" (click)="saveUserChanges(user)" [disabled]="isRowBusy(user.id) || !hasRowChanges(user)">
                                {{ isRowBusy(user.id) ? 'Bezig...' : 'Opslaan' }}
                              </button>
                              <button class="ui-btn-danger" type="button" (click)="deleteUser(user)" [disabled]="isRowBusy(user.id)">
                                {{ isRowBusy(user.id) ? 'Bezig...' : 'Verwijder' }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner ui-stack-md">
              <app-page-header title="Auditlog userbeheer" subtitle="Recente user-acties en wijzigingen voor beheercontrole." />

              @if (loading()) {
                <div class="ui-banner info"><span>Auditlog laden...</span></div>
              } @else if (auditEvents().length === 0) {
                <app-empty-state
                  eyebrow="Geen auditregels"
                  title="Nog geen user-audit events"
                  description="Pas filters aan of voer eerst een gebruikerswijziging uit om auditregels te zien."
                />
              } @else {
                <div class="ui-table-wrap">
                  <table class="ui-table">
                    <thead>
                      <tr>
                        <th>Wanneer</th>
                        <th>Wie</th>
                        <th>Actie</th>
                        <th>User ID</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (event of auditEvents(); track event.id) {
                        <tr>
                          <td>{{ event.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                          <td>{{ event.username }}</td>
                          <td><app-status-pill [label]="event.action" [state]="event.action" /></td>
                          <td>{{ event.entityId ?? '-' }}</td>
                          <td>{{ event.details ?? '-' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        </div>
      </section>
    </main>
  `,
  styles: `
    .form-cell{min-width:180px}
    .table-field{display:grid;gap:6px;min-width:160px}
    .table-field select{
      width:100%;
      min-height:42px;
      border:1px solid var(--color-line-strong);
      border-radius:14px;
      padding:0 12px;
      background:#fff;
      color:var(--color-ink-strong);
    }
    .table-label{
      color:var(--color-ink-muted);
      font-size:.72rem;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .row-actions{justify-content:flex-start}
  `,
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
