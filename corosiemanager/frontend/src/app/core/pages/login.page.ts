import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h2>Inloggen</h2>
        <p class="subtitle">Log in om Corrosiemanager te gebruiken.</p>

        @if (infoMessage()) { <p class="info">{{ infoMessage() }}</p> }

        <label class="field"><span>Username</span><input [(ngModel)]="username" /></label>
        <label class="field"><span>Password</span><input type="password" [(ngModel)]="password" /></label>

        <div class="actions">
          <button class="btn-primary" (click)="login()" [disabled]="loading()">{{ loading() ? 'Bezig...' : 'Login' }}</button>
          <a routerLink="/" class="btn-secondary">Terug</a>
        </div>

        @if (errorMessage()) { <p class="error">{{ errorMessage() }}</p> }
        <small>Demo users: engineer/engineer, reviewer/reviewer, admin/admin</small>
      </section>
    </main>
  `,
  styles: `
    .page{min-height:100vh;display:grid;place-items:center;background:linear-gradient(180deg,#f8fafc,#eef2ff);padding:24px}
    .card{width:100%;max-width:420px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px}
    .subtitle{color:#64748b;margin:0 0 12px}
    .field{display:grid;gap:6px;margin-bottom:10px;font-weight:600;color:#334155}
    input{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .actions{display:flex;gap:8px;margin-top:10px}
    .btn-primary,.btn-secondary{border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer;text-decoration:none}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}
    .error{color:#b91c1c;font-weight:600}.info{color:#1d4ed8;font-weight:600}
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected username = 'engineer';
  protected password = 'engineer';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly infoMessage = signal('');

  constructor() {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'login_required') {
      this.infoMessage.set('Je sessie is verlopen of je bent niet ingelogd.');
    }
  }

  async login(): Promise<void> {
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      await firstValueFrom(this.auth.login(this.username, this.password));
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/';
      await this.router.navigateByUrl(redirectTo);
    } catch {
      this.errorMessage.set('Login mislukt. Controleer je gegevens.');
    } finally {
      this.loading.set(false);
    }
  }
}
