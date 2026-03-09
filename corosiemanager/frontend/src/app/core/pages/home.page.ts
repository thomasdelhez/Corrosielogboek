import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthenticationService } from '../security/services/authentication.service';
import { AuthorizationService } from '../security/services/authorization.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="shell">
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>
      <div class="bg-grid"></div>

      <section class="layout">
        <header class="topbar">
          <div>
            <p class="eyebrow">F35 Corrosie Logboek</p>
            <h1>Main Menu</h1>
          </div>
          <div class="userbox">
            @if (isLoggedIn()) {
              <span class="userpill">{{ userLabel() }}</span>
              <a class="btn-soft" routerLink="/account">Mijn account</a>
              <button class="btn-outline" (click)="logout()">Uitloggen</button>
            } @else {
              <a class="btn-primary" routerLink="/login">Naar login</a>
            }
          </div>
        </header>

        <p class="subtitle">Kies een module om direct verder te werken in de onderhoudsflow.</p>
        @if (authMessage()) {
          <p class="notice">{{ authMessage() }}</p>
        }

        <section class="feature-grid">
          <article class="feature feature-wide">
            <h3>Aircraft & Panels</h3>
            <p>Selecteer aircraft, panel en beheer holes vanuit het centrale overzicht.</p>
            <a class="btn-primary" routerLink="/corrosion">Open workflow</a>
          </article>

          <article class="feature">
            <h3>Hole Repairs</h3>
            <p>Bewerk hole details, steps en parts.</p>
            <div class="row">
              <a class="btn-soft" routerLink="/corrosion">Overzicht</a>
              <a class="btn-soft" routerLink="/batch-holes">Batch Create</a>
            </div>
          </article>

          <article class="feature">
            <h3>MDR Management</h3>
            <p>Status, cases en request details.</p>
            @if (canUseMdr()) {
              <a class="btn-soft" routerLink="/mdr">Open MDR</a>
            } @else {
              <button class="btn-disabled" disabled>Reviewer/Admin vereist</button>
            }
          </article>

          <article class="feature">
            <h3>NDI Reports</h3>
            <p>Bekijk en onderhoud NDI-workflow.</p>
            @if (canUseNdi()) {
              <a class="btn-soft" routerLink="/ndi">Open NDI</a>
            } @else {
              <button class="btn-disabled" disabled>Reviewer/Admin vereist</button>
            }
          </article>

          <article class="feature">
            <h3>Ordering</h3>
            <p>Volg onderdelen en leverstatus in één tracker.</p>
            <a class="btn-soft" routerLink="/ordering">Open Tracker</a>
          </article>

          <article class="feature">
            <h3>Inspectie & Installatie</h3>
            <p>Queues en trackers voor inspectie, reaming en installatie.</p>
            <div class="row">
              <a class="btn-soft" routerLink="/inspection">Inspectie</a>
              <a class="btn-soft" routerLink="/trackers">Trackers</a>
              <a class="btn-soft" routerLink="/installation">Installatie</a>
            </div>
          </article>

          <article class="feature">
            <h3>Admin</h3>
            <p>Beheer aircraft en panel records.</p>
            @if (canUseAdmin()) {
              <div class="row">
                <a class="btn-soft" routerLink="/admin/master-data">Master Data</a>
                <a class="btn-soft" routerLink="/admin/users">User Control</a>
              </div>
            } @else {
              <button class="btn-disabled" disabled>Admin vereist</button>
            }
          </article>

          <article class="feature">
            <h3>Rapportage</h3>
            <p>Exports voor review en rapportage.</p>
            <a class="btn-soft" routerLink="/reports/corrosion-tracker">Open Reports</a>
          </article>
        </section>
      </section>
    </main>
  `,
  styles: `
    .shell{
      position:relative;min-height:100vh;padding:28px 20px;overflow:hidden;
      background:linear-gradient(170deg,#f8fafc 0%,#eef2ff 48%,#e2e8f0 100%);
      font-family:"Space Grotesk","Segoe UI",sans-serif;
    }
    .bg-grid{
      position:absolute;inset:0;pointer-events:none;opacity:.2;
      background-image:linear-gradient(to right,#64748b1c 1px,transparent 1px),linear-gradient(to bottom,#64748b1c 1px,transparent 1px);
      background-size:36px 36px;
      mask-image:radial-gradient(circle at 50% 10%,#000 20%,transparent 85%);
    }
    .bg-orb{position:absolute;border-radius:999px;filter:blur(44px);pointer-events:none}
    .orb-a{width:360px;height:360px;top:-120px;left:-80px;background:#93c5fd66}
    .orb-b{width:320px;height:320px;right:-90px;bottom:-140px;background:#c4b5fd55}

    .layout{
      position:relative;z-index:1;max-width:1160px;margin:0 auto;padding:18px;
      background:#ffffffc7;border:1px solid #e2e8f0;border-radius:20px;backdrop-filter:blur(6px);
      box-shadow:0 20px 40px #0f172a1a;
    }
    .topbar{
      display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap;
      padding:4px 4px 10px;
    }
    .eyebrow{
      margin:0;color:#2563eb;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    }
    h1{margin:6px 0 0;font-size:clamp(1.6rem,3vw,2.2rem);color:#0f172a}
    .subtitle{margin:0 0 14px;padding:0 4px;color:#475569;max-width:70ch}
    .notice{
      margin:0 4px 14px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:10px;
      background:#eff6ff;color:#1d4ed8;font-weight:600;
    }
    .userbox{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .userpill{
      display:inline-flex;align-items:center;padding:7px 12px;border-radius:999px;
      background:#e2e8f0;color:#0f172a;font-weight:700;font-size:.9rem;
    }

    .feature-grid{
      display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;
    }
    .feature{
      border:1px solid #dbeafe;border-radius:14px;padding:14px;background:#f8fafc;
      transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .feature:hover{
      transform:translateY(-2px);
      box-shadow:0 10px 22px #1e293b1a;
      border-color:#93c5fd;
    }
    .feature-wide{grid-column:span 2;background:linear-gradient(140deg,#eff6ff 0%,#f8fafc 78%)}
    .feature h3{margin:0 0 6px;color:#0f172a}
    .feature p{margin:0 0 12px;color:#64748b;line-height:1.4}
    .row{display:flex;gap:8px;flex-wrap:wrap}

    .btn-primary,.btn-soft,.btn-outline,.btn-disabled{
      border:0;border-radius:10px;padding:9px 12px;font-weight:700;text-decoration:none;display:inline-block;cursor:pointer;
    }
    .btn-primary{background:#2563eb;color:#fff}
    .btn-soft{background:#e2e8f0;color:#334155}
    .btn-outline{background:#fff;border:1px solid #cbd5e1;color:#334155}
    .btn-disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}

    @media (max-width:960px){
      .feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .feature-wide{grid-column:span 2}
    }
    @media (max-width:700px){
      .shell{padding:16px}
      .layout{padding:14px}
      .feature-grid{grid-template-columns:1fr}
      .feature-wide{grid-column:span 1}
      .userbox{width:100%}
    }
  `,
})
export class HomePage {
  private readonly auth = inject(AuthenticationService);
  private readonly toast = inject(ToastService);
  private readonly authorization = inject(AuthorizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly authMessage = signal<string>('');

  constructor() {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'role_required') {
      this.authMessage.set('Je rol heeft geen toegang tot die pagina.');
    }
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser();
  }

  userLabel(): string {
    const user = this.auth.currentUser();
    return user ? `${user.username} (${user.roles[0]})` : '-';
  }

  canUseMdr(): boolean {
    const user = this.auth.currentUser();
    return this.authorization.hasRole(user, 'reviewer') || this.authorization.hasRole(user, 'admin');
  }

  canUseNdi(): boolean {
    const user = this.auth.currentUser();
    return this.authorization.hasRole(user, 'reviewer') || this.authorization.hasRole(user, 'admin');
  }

  canUseAdmin(): boolean {
    const user = this.auth.currentUser();
    return this.authorization.hasRole(user, 'admin');
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    this.authMessage.set('Uitgelogd');
    this.toast.info('Uitgelogd');
    await this.router.navigate(['/login'], { queryParams: { reason: 'login_required' } });
  }
}
