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
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
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
