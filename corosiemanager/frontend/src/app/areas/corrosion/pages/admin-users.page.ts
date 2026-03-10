import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AppUser, UserAuditEvent } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Admin — User Control</h2>
        <p class="subtitle">Alleen admins kunnen users aanmaken en rollen toekennen.</p>

        <section class="subcard">
          <h3>Nieuwe user</h3>
          <div class="grid">
            <label class="field">
              <span>Username</span>
              <input [(ngModel)]="newUsername" />
            </label>
            <label class="field">
              <span>Password</span>
              <input [(ngModel)]="newPassword" type="password" />
            </label>
            <label class="field">
              <span>Rol</span>
              <select [(ngModel)]="newRole">
                @for (role of roles; track role) {
                  <option [value]="role">{{ role }}</option>
                }
              </select>
            </label>
          </div>
          <button class="btn-primary" type="button" (click)="createUser()">User aanmaken</button>
        </section>

        <section class="subcard" style="margin-top:12px;">
          <h3>Bestaande users</h3>
          @if (loading()) {
            <p class="state">Laden...</p>
          } @else if (users().length === 0) {
            <p class="state">Geen users gevonden.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>Username</th><th>Rol</th><th>Actief</th><th>Acties</th></tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td>{{ user.id }}</td>
                      <td>{{ user.username }}</td>
                      <td>
                        <select [ngModel]="roleDraft(user)" (ngModelChange)="setRoleDraft(user.id, $event)">
                          @for (role of roles; track role) {
                            <option [value]="role">{{ role }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <select [ngModel]="activeDraft(user)" (ngModelChange)="setActiveDraft(user.id, $event)">
                          <option [ngValue]="true">Ja</option>
                          <option [ngValue]="false">Nee</option>
                        </select>
                      </td>
                      <td>
                        <div class="actions">
                          <button class="btn-secondary" type="button" (click)="saveUserChanges(user)" [disabled]="isRowBusy(user.id) || !hasRowChanges(user)">
                            {{ isRowBusy(user.id) ? 'Bezig...' : 'Opslaan' }}
                          </button>
                          <button class="btn-danger" type="button" (click)="deleteUser(user)" [disabled]="isRowBusy(user.id)">
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
        </section>

        <section class="subcard" style="margin-top:12px;">
          <h3>Auditlog userbeheer</h3>
          <div class="grid">
            <label class="field">
              <span>Actie</span>
              <select [(ngModel)]="auditAction" (ngModelChange)="onAuditFilterChange()">
                <option value="">Alle acties</option>
                @for (action of auditActionOptions; track action) {
                  <option [value]="action">{{ action }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Gebruiker</span>
              <input [(ngModel)]="auditUsername" (ngModelChange)="onAuditFilterChange()" placeholder="admin" />
            </label>
            <label class="field">
              <span>Van datum</span>
              <input [(ngModel)]="auditDateFrom" (ngModelChange)="onAuditFilterChange()" type="datetime-local" />
            </label>
            <label class="field">
              <span>Tot datum</span>
              <input [(ngModel)]="auditDateTo" (ngModelChange)="onAuditFilterChange()" type="datetime-local" />
            </label>
            <label class="field">
              <span>Max regels</span>
              <input [(ngModel)]="auditLimit" (ngModelChange)="onAuditFilterChange()" type="number" min="1" max="500" />
            </label>
          </div>
          <div class="actions">
            <button class="btn-secondary" type="button" (click)="resetAuditFilters()">Reset filters</button>
          </div>
          @if (loading()) {
            <p class="state">Laden...</p>
          } @else if (auditEvents().length === 0) {
            <p class="state">Nog geen audit events.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Wanneer</th><th>Wie</th><th>Actie</th><th>User ID</th><th>Details</th></tr>
                </thead>
                <tbody>
                  @for (event of auditEvents(); track event.id) {
                    <tr>
                      <td>{{ event.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                      <td>{{ event.username }}</td>
                      <td>{{ event.action }}</td>
                      <td>{{ event.entityId ?? '-' }}</td>
                      <td>{{ event.details ?? '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </section>
    </main>
  `,
  styles: `
    .page{max-width:980px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .subcard{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .field{display:grid;gap:6px;font-weight:600;color:#334155}
    input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    .btn-primary,.btn-secondary,.btn-danger{border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}
    .btn-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .btn-secondary:disabled,.btn-danger:disabled{opacity:.5;cursor:not-allowed}
    .table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto}
    table{width:100%;border-collapse:collapse} th,td{padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:left}
    .state{color:#64748b}
    @media(max-width:820px){.grid{grid-template-columns:1fr}}
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
    this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, role: nextRole } : r)));
    this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, isActive: nextActive } : r)));
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
      this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, role: previousRole } : r)));
      this.users.update((rows) => rows.map((r) => (r.id === user.id ? { ...r, isActive: previousActive } : r)));
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

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await firstValueFrom(this.svc.listUsers());
      this.users.set(rows);
      this.roleDrafts.set(Object.fromEntries(rows.map((u) => [u.id, u.role])) as Record<number, 'engineer' | 'reviewer' | 'admin'>);
      this.activeDrafts.set(Object.fromEntries(rows.map((u) => [u.id, u.isActive])) as Record<number, boolean>);
      await this.loadAuditEvents();
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
