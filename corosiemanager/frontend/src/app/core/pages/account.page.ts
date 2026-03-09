import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../shared/services/api-error.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>
      <section class="card">
        <h2>Mijn Account</h2>
        <p class="subtitle">Wijzig je eigen username en/of wachtwoord.</p>

        <div class="current">
          <p><strong>Huidige username:</strong> {{ currentUsername() }}</p>
          <p><strong>Rol:</strong> {{ currentRole() }}</p>
        </div>

        <form (ngSubmit)="save()">
          <label class="field">
            <span>Huidig wachtwoord (verplicht)</span>
            <input [(ngModel)]="currentPassword" name="currentPassword" type="password" />
          </label>
          <label class="field">
            <span>Nieuwe username (optioneel)</span>
            <input [(ngModel)]="newUsername" name="newUsername" />
          </label>
          <label class="field">
            <span>Nieuw wachtwoord (optioneel, min 6 tekens)</span>
            <input [(ngModel)]="newPassword" name="newPassword" type="password" />
          </label>

          <div class="actions">
            <button class="btn-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Opslaan...' : 'Opslaan' }}</button>
            <a class="btn-secondary" routerLink="/">Annuleren</a>
          </div>
        </form>
      </section>
    </main>
  `,
  styles: `
    .page{max-width:760px;margin:0 auto;padding:24px}
    .back{text-decoration:none;color:#334155;font-weight:600}
    .card{margin-top:10px;border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}
    .subtitle{color:#64748b}
    .current{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:12px}
    .current p{margin:4px 0}
    .field{display:grid;gap:6px;margin-bottom:10px;font-weight:600;color:#334155}
    input{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .actions{display:flex;gap:8px;margin-top:8px}
    .btn-primary,.btn-secondary{border:0;border-radius:8px;padding:8px 12px;font-weight:700;text-decoration:none;display:inline-block}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}
  `,
})
export class AccountPage {
  private readonly auth = inject(AuthenticationService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected currentPassword = '';
  protected newUsername = '';
  protected newPassword = '';

  protected currentUsername(): string {
    return this.auth.currentUser()?.username ?? '-';
  }

  protected currentRole(): string {
    return this.auth.currentUser()?.roles[0] ?? '-';
  }

  async save(): Promise<void> {
    if (!this.currentPassword) {
      this.toast.info('Huidig wachtwoord is verplicht.');
      return;
    }
    if (!this.newUsername.trim() && !this.newPassword) {
      this.toast.info('Vul een nieuwe username en/of nieuw wachtwoord in.');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(
        this.auth.updateOwnAccount({
          currentPassword: this.currentPassword,
          newUsername: this.newUsername.trim() || null,
          newPassword: this.newPassword || null,
        }),
      );
      this.currentPassword = '';
      this.newPassword = '';
      this.newUsername = '';
      this.toast.success('Account bijgewerkt.');
    } catch (e: unknown) {
      this.toast.error(this.apiErrors.toUserMessage(e, 'Account bijwerken mislukt'));
    } finally {
      this.loading.set(false);
    }
  }
}
