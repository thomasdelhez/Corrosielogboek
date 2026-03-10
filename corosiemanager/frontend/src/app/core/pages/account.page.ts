import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusPillComponent } from '../../shared/components/status-pill.component';
import { ApiErrorService } from '../../shared/services/api-error.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink, PageHeaderComponent, StatusPillComponent],
  template: `
    <main class="ui-page">
      <section class="ui-surface">
        <div class="ui-surface-inner ui-stack-md">
          <app-page-header
            eyebrow="Account"
            title="Mijn account"
            subtitle="Werk je gebruikersnaam en wachtwoord veilig bij zonder de werkstroom te verlaten."
          />

          <section class="summary-grid">
            <article class="summary-card">
              <p class="summary-label">Actieve gebruiker</p>
              <strong>{{ currentUsername() }}</strong>
            </article>
            <article class="summary-card">
              <p class="summary-label">Rol</p>
              <app-status-pill [label]="currentRole()" [state]="currentRole()" />
            </article>
          </section>

          <section class="ui-section">
            <div class="ui-section-inner">
              <form class="ui-grid two" (ngSubmit)="save()">
                <label class="ui-field">
                  <span>Huidig wachtwoord</span>
                  <input [(ngModel)]="currentPassword" name="currentPassword" type="password" />
                </label>
                <div class="hint-card">
                  <strong>Veiligheid</strong>
                  <p>Je huidige wachtwoord is verplicht voordat accountwijzigingen worden opgeslagen.</p>
                </div>
                <label class="ui-field">
                  <span>Nieuwe username</span>
                  <input [(ngModel)]="newUsername" name="newUsername" />
                </label>
                <label class="ui-field">
                  <span>Nieuw wachtwoord</span>
                  <input [(ngModel)]="newPassword" name="newPassword" type="password" />
                </label>

                <div class="form-actions">
                  <button class="ui-btn" type="submit" [disabled]="loading()">
                    {{ loading() ? 'Opslaan...' : 'Opslaan' }}
                  </button>
                  <a class="ui-btn-secondary" routerLink="/">Annuleren</a>
                </div>
              </form>
            </div>
          </section>
        </div>
      </section>
    </main>
  `,
  styles: `
    .summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .summary-card,.hint-card{
      padding:18px;border-radius:18px;border:1px solid var(--color-line);background:linear-gradient(180deg,#fff,#f6f9fc);
    }
    .summary-label{margin:0 0 8px;color:var(--color-ink-muted);font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700}
    .summary-card strong{font:700 1.2rem/1.1 var(--font-heading);color:var(--color-ink-strong)}
    .hint-card strong{display:block;margin-bottom:6px;color:var(--color-ink-strong)}
    .hint-card p{margin:0;color:var(--color-ink-muted)}
    .form-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    @media (max-width:800px){.summary-grid{grid-template-columns:1fr}}
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
