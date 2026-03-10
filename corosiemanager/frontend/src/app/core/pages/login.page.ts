import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../shared/services/api-error.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthenticationService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected username = 'engineer';
  protected password = 'engineer';
  protected readonly loading = signal(false);

  constructor() {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'login_required') {
      this.toast.info('Je sessie is verlopen of je bent niet ingelogd.');
    }
  }

  async login(): Promise<void> {
    this.loading.set(true);
    try {
      await firstValueFrom(this.auth.login(this.username, this.password));
      this.toast.success('Succesvol ingelogd.');
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/';
      await this.router.navigateByUrl(redirectTo);
    } catch (e: unknown) {
      const msg = this.apiErrors.toUserMessage(e, 'Login mislukt');
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
