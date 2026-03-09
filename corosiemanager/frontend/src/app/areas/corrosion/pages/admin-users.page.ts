import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../../shared/services/api-error.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AppUser } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, RouterLink],
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
                  <tr><th>ID</th><th>Username</th><th>Rol</th><th>Actie</th></tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td>{{ user.id }}</td>
                      <td>{{ user.username }}</td>
                      <td>
                        <select [ngModel]="roleDrafts()[user.id] ?? user.role" (ngModelChange)="setRoleDraft(user.id, $event)">
                          @for (role of roles; track role) {
                            <option [value]="role">{{ role }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <button class="btn-secondary" type="button" (click)="saveRole(user)">Opslaan rol</button>
                      </td>
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
    .btn-primary,.btn-secondary{border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}
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
  protected readonly roleDrafts = signal<Record<number, 'engineer' | 'reviewer' | 'admin'>>({});
  protected readonly loading = signal<boolean>(true);
  protected readonly roles: Array<'engineer' | 'reviewer' | 'admin'> = ['engineer', 'reviewer', 'admin'];

  protected newUsername = '';
  protected newPassword = '';
  protected newRole: 'engineer' | 'reviewer' | 'admin' = 'engineer';

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

  async saveRole(user: AppUser): Promise<void> {
    const nextRole = this.roleDrafts()[user.id] ?? user.role;
    if (nextRole === user.role) {
      this.toast.info('Rol is ongewijzigd.');
      return;
    }
    try {
      const updated = await firstValueFrom(this.svc.updateUserRole(user.id, nextRole));
      this.users.update((rows) => rows.map((r) => (r.id === user.id ? updated : r)));
      this.toast.success(`Rol bijgewerkt naar ${updated.role}.`);
    } catch (e: unknown) {
      this.toast.error(this.apiErrors.toUserMessage(e, 'Rol wijzigen mislukt'));
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await firstValueFrom(this.svc.listUsers());
      this.users.set(rows);
      this.roleDrafts.set(Object.fromEntries(rows.map((u) => [u.id, u.role])) as Record<number, 'engineer' | 'reviewer' | 'admin'>);
    } finally {
      this.loading.set(false);
    }
  }
}
