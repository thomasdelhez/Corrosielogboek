import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../security/services/authentication.service';
import { AuthorizationService } from '../security/services/authorization.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, FormsModule],
  template: `
    <main class="page">
      <section class="hero-card">
        <p class="eyebrow">F35 Corrosie Logboek</p>
        <h1>Main Menu</h1>
        <p class="subtitle">Kies een optie om te starten.</p>

        <div class="auth-box">
          @if (!isLoggedIn()) {
            <input [(ngModel)]="username" placeholder="username" />
            <input [(ngModel)]="password" placeholder="password" type="password" />
            <button class="btn-primary" (click)="login()">Login</button>
            <small>Demo users: engineer/engineer, reviewer/reviewer, admin/admin</small>
          } @else {
            <p>Ingelogd als <strong>{{ userLabel() }}</strong></p>
            <button class="btn-secondary" (click)="logout()">Uitloggen</button>
          }
          @if (authMessage()) { <p class="auth-msg">{{ authMessage() }}</p> }
        </div>

        <div class="menu-grid">
          <article class="menu-card">
            <h3>Aircraft & Panels</h3>
            <p>Selecteer aircraft, panel en beheer holes.</p>
            <a class="btn-primary linkbtn" routerLink="/corrosion">Open workflow</a>
          </article>

          <article class="menu-card">
            <h3>Hole Repairs</h3>
            <p>Bekijk en bewerk hole details, steps en parts.</p>
            <a class="btn-primary linkbtn" routerLink="/corrosion">Open hole overzicht</a>
          </article>

          <article class="menu-card">
            <h3>MDR Management</h3>
            <p>MDR status, cases en request details.</p>
            @if (canUseMdr()) {
              <a class="btn-secondary linkbtn" routerLink="/mdr">Open MDR sectie</a>
            } @else {
              <button class="btn-ghost" disabled>Reviewer/Admin vereist</button>
            }
          </article>

          <article class="menu-card">
            <h3>NDI Reports</h3>
            <p>NDI reports bekijken, toevoegen en verwijderen.</p>
            @if (canUseNdi()) {
              <a class="btn-secondary linkbtn" routerLink="/ndi">Open NDI sectie</a>
            } @else {
              <button class="btn-ghost" disabled>Reviewer/Admin vereist</button>
            }
          </article>

          <article class="menu-card">
            <h3>Ordering Tracker</h3>
            <p>Overzicht van onderdelen en leverstatus.</p>
            <a class="btn-secondary linkbtn" routerLink="/ordering">Open Ordering Tracker</a>
          </article>

          <article class="menu-card">
            <h3>Data Export</h3>
            <p>Exporteer data voor review en rapportage.</p>
            <button class="btn-ghost" (click)="comingSoon('Data Export')">Open</button>
          </article>
        </div>
      </section>
    </main>
  `,
  styles: `
    .page { min-height: 100vh; background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); padding: 32px 24px; display: grid; place-items: start center; }
    .hero-card { width: 100%; max-width: 1100px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); padding: 28px; }
    .eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 0.86rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    h1 { margin: 0; color: #0f172a; font-size: clamp(1.5rem, 2.2vw, 2rem); }
    .subtitle { margin: 12px 0 0; color: #475569; max-width: 70ch; line-height: 1.5; }
    .auth-box{margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;padding:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .auth-box input{padding:8px;border:1px solid #cbd5e1;border-radius:8px}
    .auth-msg{margin:0;color:#0f766e;font-weight:600}
    .menu-grid { margin-top: 22px; display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .menu-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fff; }
    .menu-card h3 { margin: 0 0 6px; font-size: 1.05rem; color: #0f172a; }
    .menu-card p { margin: 0 0 12px; color: #64748b; font-size: 0.94rem; }
    .btn-primary,.btn-secondary,.btn-ghost { border-radius: 9px; padding: 9px 12px; font-weight: 700; cursor: pointer; border: 0; text-decoration: none; display: inline-block; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-secondary { background: #e0e7ff; color: #3730a3; }
    .btn-ghost { background: #f1f5f9; color: #334155; }
    .btn-ghost[disabled]{opacity:.6;cursor:not-allowed}
    @media (max-width: 820px) { .menu-grid { grid-template-columns: 1fr; } }
  `,
})
export class HomePage {
  private readonly auth = inject(AuthenticationService);
  private readonly authorization = inject(AuthorizationService);

  protected username = 'engineer';
  protected password = 'engineer';
  protected readonly authMessage = signal<string>('');

  constructor() {
    this.auth.restoreFromStorage();
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

  async login(): Promise<void> {
    try {
      await firstValueFrom(this.auth.login(this.username, this.password));
      this.authMessage.set('Ingelogd ✅');
    } catch {
      this.authMessage.set('Login mislukt ❌');
    }
  }

  logout(): void {
    this.auth.logout();
    this.authMessage.set('Uitgelogd');
  }

  comingSoon(feature: string): void {
    alert(`${feature} volgt in een volgende stap.`);
  }
}
