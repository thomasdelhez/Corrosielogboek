import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService } from '../../shared/services/api-error.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="sky-grid"></div>
      <div class="haze haze-a"></div>
      <div class="haze haze-b"></div>
      <div class="plane plane-a"></div>
      <div class="plane plane-b"></div>
      <div class="plane plane-c"></div>

      <section class="card">
        <p class="eyebrow">Corrosiemanager</p>
        <h2>Inloggen</h2>
        <p class="subtitle">Log in om Corrosiemanager te gebruiken.</p>

        <form (ngSubmit)="login()">
          <label class="field">
            <span>Username</span>
            <input [(ngModel)]="username" name="username" />
          </label>
          <label class="field">
            <span>Password</span>
            <input type="password" [(ngModel)]="password" name="password" />
          </label>

          <div class="actions">
            <button class="btn-primary" type="submit" [disabled]="loading()">{{ loading() ? 'Authenticeren...' : 'Login' }}</button>
            <a routerLink="/" class="btn-secondary">Terug</a>
          </div>
        </form>

        <small>Demo: engineer/engineer · reviewer/reviewer · admin/admin</small>
      </section>
    </main>
  `,
  styles: `
    .page{
      --bg0:#f8fafc;--bg1:#eef2ff;--bg2:#dbeafe;--accent:#2563eb;--card:#ffffffd9;
      position:relative;min-height:100vh;overflow:hidden;display:grid;place-items:center;padding:24px;
      background:radial-gradient(1200px 600px at 75% -10%, #bfdbfe 0%, transparent 60%),linear-gradient(155deg,var(--bg0) 0%,var(--bg1) 46%,var(--bg2) 100%);
    }
    .sky-grid{
      position:absolute;inset:0;opacity:.16;pointer-events:none;
      background-image:linear-gradient(to right, #9ec5e61a 1px, transparent 1px),linear-gradient(to bottom, #9ec5e61a 1px, transparent 1px);
      background-size:42px 42px;
      mask-image:radial-gradient(circle at center, #000 35%, transparent 100%);
    }
    .haze{
      position:absolute;border-radius:999px;filter:blur(50px);pointer-events:none;opacity:.65;
      animation:float 18s ease-in-out infinite;
    }
    .haze-a{width:520px;height:220px;left:-80px;top:20%;background:#93c5fd44}
    .haze-b{width:460px;height:180px;right:-120px;bottom:12%;background:#c7d2fe4a;animation-delay:2s}
    .plane{
      --svg:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 140'%3E%3Cpath fill='black' d='M7 70l68-18 102-44 58-3-17 33 86 26 109 6-109 6-86 26 17 33-58-3-102-44zM153 68l56 2-56 2z'/%3E%3C/svg%3E");
      position:absolute;width:360px;height:120px;opacity:.2;pointer-events:none;
      background:linear-gradient(140deg,#94a3b8 0%,#64748b 45%,#334155 100%);
      -webkit-mask-image:var(--svg);mask-image:var(--svg);
      -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
      -webkit-mask-size:contain;mask-size:contain;
      -webkit-mask-position:center;mask-position:center;
      filter:drop-shadow(0 10px 14px #47556944);
      animation:drift 22s ease-in-out infinite;
    }
    .plane-a{top:10%;left:-70px;transform:scale(1.06) rotate(-7deg)}
    .plane-b{top:42%;right:-100px;transform:scale(.9) rotate(8deg);animation-delay:3s}
    .plane-c{bottom:12%;left:8%;transform:scale(.66) rotate(3deg);animation-delay:1.2s}
    .card{
      position:relative;z-index:2;width:100%;max-width:460px;color:#0f172a;
      background:var(--card);border:1px solid #dbeafe;border-radius:18px;padding:24px;
      backdrop-filter:blur(6px);box-shadow:0 14px 30px #0f172a1a;
    }
    .eyebrow{margin:0 0 8px;color:var(--accent);font-size:.78rem;letter-spacing:.11em;text-transform:uppercase;font-weight:700}
    h2{margin:0;font-size:2rem;line-height:1.05;letter-spacing:.01em}
    .subtitle{color:#475569;margin:10px 0 14px}
    .field{display:grid;gap:6px;margin-bottom:11px;font-weight:600;color:#334155}
    input{padding:10px 11px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#0f172a}
    input:focus{outline:none;border-color:#60a5fa;box-shadow:0 0 0 3px #93c5fd5c}
    .actions{display:flex;gap:10px;margin-top:12px}
    .btn-primary,.btn-secondary{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none}
    .btn-primary{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff}
    .btn-secondary{background:#e2e8f0;color:#334155}
    small{display:block;margin-top:14px;color:#64748b}
    @keyframes drift{0%,100%{translate:0 0}50%{translate:16px -8px}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    @media (max-width:720px){
      .plane{width:220px;height:84px;opacity:.36}
      .card{max-width:100%;padding:20px}
      h2{font-size:1.7rem}
    }
  `,
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
