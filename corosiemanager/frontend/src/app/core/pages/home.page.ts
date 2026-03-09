import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CorrosionService } from '../../areas/corrosion/services/corrosion.service';
import { GlobalSearchResult } from '../../areas/corrosion/models/corrosion.models';
import { ToastService } from '../../shared/services/toast.service';
import { PermissionService } from '../security/services/permission.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, FormsModule],
  template: `
    <main class="shell">
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>
      <div class="bg-grid"></div>

      <section class="layout">
        <header class="topbar">
          <div>
            <p class="eyebrow">F35 Corrosie Logboek</p>
            <h1>Hoofdmenu</h1>
          </div>
          <div class="userbox">
            @if (isLoggedIn()) {
              <a class="account-link" routerLink="/account" aria-label="Open mijn account">
                <span class="account-name">{{ userLabel() }}</span>
                <span class="account-cta">Mijn account</span>
              </a>
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

        @if (isLoggedIn()) {
          <section class="task-panel">
            <div>
              <p class="task-eyebrow">Jouw taken</p>
              <h2 class="task-title">{{ roleHeading() }}</h2>
              <ul class="task-list">
                @for (item of roleTasks(); track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
            <div class="quick-actions">
              <p class="quick-title">Snelle acties</p>
              @for (action of quickActions(); track action.label) {
                <a class="btn-soft" [routerLink]="action.path" [queryParams]="action.queryParams ?? null">{{ action.label }}</a>
              }
            </div>
          </section>
        }

        <section class="search-panel">
          <p class="search-title">Zoek direct op aircraft, panel, hole of MDR</p>
          <form class="search-form" (ngSubmit)="runGlobalSearch()">
            <input [(ngModel)]="globalSearchQuery" name="globalSearchQuery" placeholder="Bijv. AN 10, panel 190, hole 123, MDR-001" />
            <button class="btn-primary" type="submit" [disabled]="searchLoading()">{{ searchLoading() ? 'Zoeken...' : 'Zoeken' }}</button>
          </form>
          @if (searchResults().length > 0) {
            <div class="search-results">
              @for (result of searchResults(); track result.route + result.title) {
                <button class="result-item" type="button" (click)="openSearchResult(result)">
                  <span class="result-kind">{{ result.kind }}</span>
                  <strong>{{ result.title }}</strong>
                  @if (result.subtitle) {
                    <span class="result-sub">{{ result.subtitle }}</span>
                  }
                </button>
              }
            </div>
          } @else if (searchTried() && !searchLoading()) {
            <p class="search-empty">Geen resultaten gevonden.</p>
          }
        </section>

        <section class="feature-grid">
          <article class="feature feature-wide">
            <h3>Aircraft & Panels</h3>
            <p>Selecteer aircraft, panel en beheer holes vanuit het centrale overzicht.</p>
            <div class="row">
              <a class="btn-primary" routerLink="/corrosion">Open workflow</a>
              <a class="btn-soft" routerLink="/admin/aircraft-beheer">Aircraft beheer</a>
            </div>
          </article>

          @if (canUseMdr()) {
            <article class="feature">
              <h3>MDR Management</h3>
              <p>Status, cases en request details.</p>
              <a class="btn-soft" routerLink="/mdr">Open MDR</a>
            </article>
          }

          @if (canUseNdi()) {
            <article class="feature">
              <h3>NDI Reports</h3>
              <p>Bekijk en onderhoud NDI-workflow.</p>
              <a class="btn-soft" routerLink="/ndi">Open NDI</a>
            </article>
          }

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

          @if (canUseAdmin()) {
            <article class="feature">
              <h3>Admin</h3>
              <p>Beheer gebruikers en rollen.</p>
              <div class="row">
                <a class="btn-soft" routerLink="/admin/users">User Control</a>
              </div>
            </article>
          }

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
    .account-link{
      display:flex;align-items:center;gap:10px;padding:7px 10px 7px 12px;border-radius:999px;
      background:#e2e8f0;color:#0f172a;text-decoration:none;border:1px solid #cbd5e1;
      transition:background .15s ease, border-color .15s ease;
    }
    .account-link:hover{background:#dbeafe;border-color:#93c5fd}
    .account-name{font-weight:700;font-size:.9rem}
    .account-cta{
      display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;
      background:#ffffff;color:#334155;font-weight:700;font-size:.78rem;
    }

    .feature-grid{
      display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;
    }
    .search-panel{
      margin:0 4px 16px;padding:14px;border:1px solid #dbeafe;border-radius:14px;background:#ffffffb8;
    }
    .search-title{margin:0 0 8px;color:#0f172a;font-weight:700}
    .search-form{display:flex;gap:8px;flex-wrap:wrap}
    .search-form input{
      flex:1;min-width:220px;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;background:#fff;
    }
    .search-results{margin-top:10px;display:grid;gap:8px}
    .result-item{
      text-align:left;border:1px solid #dbeafe;border-radius:10px;background:#f8fafc;padding:9px 10px;
      display:grid;gap:3px;cursor:pointer;
    }
    .result-kind{
      width:max-content;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
      padding:2px 6px;border-radius:999px;background:#dbeafe;color:#1e40af;
    }
    .result-sub{color:#64748b}
    .search-empty{margin:8px 0 0;color:#64748b}
    .task-panel{
      display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin:0 4px 16px;padding:14px;
      border:1px solid #dbeafe;border-radius:14px;background:linear-gradient(130deg,#f8fafc 0%,#eff6ff 100%);
    }
    .task-eyebrow{
      margin:0;color:#2563eb;font-size:.75rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
    }
    .task-title{margin:5px 0 8px;font-size:1.15rem;color:#0f172a}
    .task-list{margin:0;padding-left:18px;color:#334155;display:grid;gap:6px}
    .quick-actions{
      border:1px solid #dbeafe;border-radius:12px;background:#ffffffb3;padding:12px;
      display:flex;flex-direction:column;gap:8px;
    }
    .quick-title{margin:0 0 2px;font-size:.82rem;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
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

    .btn-primary,.btn-soft,.btn-outline{
      border:0;border-radius:10px;padding:9px 12px;font-weight:700;text-decoration:none;display:inline-block;cursor:pointer;
    }
    .btn-primary{background:#2563eb;color:#fff}
    .btn-soft{background:#e2e8f0;color:#334155}
    .btn-outline{background:#fff;border:1px solid #cbd5e1;color:#334155}

    @media (max-width:960px){
      .feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .feature-wide{grid-column:span 2}
      .task-panel{grid-template-columns:1fr}
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
  private readonly corrosionService = inject(CorrosionService);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly authMessage = signal<string>('');
  protected readonly searchLoading = signal<boolean>(false);
  protected readonly searchResults = signal<GlobalSearchResult[]>([]);
  protected readonly searchTried = signal<boolean>(false);
  protected readonly reviewerTasks = [
    'Beoordeel open MDR-cases en werk statusovergangen bij.',
    'Controleer NDI-rapporten op afwijkingen.',
    'Deel bevindingen via remarks voor engineering.',
  ];
  protected readonly engineerTasks = [
    'Werk hole repairs en panel-data bij.',
    'Houd ordering en installatieflow actueel.',
    'Verwerk inspectie-items in de juiste tracker.',
  ];
  protected readonly adminTasks = [
    'Beheer gebruikers en roltoekenning.',
    'Onderhoud aircraft- en panelgegevens.',
    'Bewaak MDR/NDI-doorlooptijd en kwaliteitsstappen.',
  ];
  protected globalSearchQuery = '';

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
    return this.permissions.canAccessReviewerArea(this.auth.currentUser());
  }

  canUseNdi(): boolean {
    return this.permissions.canAccessReviewerArea(this.auth.currentUser());
  }

  canUseAdmin(): boolean {
    return this.permissions.canAccessAdminArea(this.auth.currentUser());
  }

  roleHeading(): string {
    const user = this.auth.currentUser();
    if (this.permissions.isAdmin(user)) {
      return 'Admin focus voor vandaag';
    }
    if (this.permissions.canAccessReviewerArea(user)) {
      return 'Reviewer prioriteiten';
    }
    return 'Engineer werkpakket';
  }

  roleTasks(): string[] {
    const user = this.auth.currentUser();
    if (this.permissions.isAdmin(user)) {
      return this.adminTasks;
    }
    if (this.permissions.canAccessReviewerArea(user)) {
      return this.reviewerTasks;
    }
    return this.engineerTasks;
  }

  quickActions(): { label: string; path: string; queryParams?: Record<string, string> }[] {
    const user = this.auth.currentUser();
    if (this.permissions.isAdmin(user)) {
      return [
        { label: 'Gebruiker toevoegen', path: '/admin/users' },
        { label: 'Aircraft beheer', path: '/admin/aircraft-beheer' },
        { label: 'Nieuwe MDR', path: '/mdr', queryParams: { action: 'new-case' } },
      ];
    }
    if (this.permissions.canAccessReviewerArea(user)) {
      return [
        { label: 'Open MDR queue', path: '/mdr' },
        { label: 'Open NDI queue', path: '/ndi' },
        { label: 'Open rapportage', path: '/reports/corrosion-tracker' },
      ];
    }
    return [
      { label: 'Open panel overzicht', path: '/corrosion' },
      { label: 'Open inspectie', path: '/inspection' },
      { label: 'Open ordering tracker', path: '/ordering' },
    ];
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    this.authMessage.set('Uitgelogd');
    this.toast.info('Uitgelogd');
    await this.router.navigate(['/login'], { queryParams: { reason: 'login_required' } });
  }

  async runGlobalSearch(): Promise<void> {
    const query = this.globalSearchQuery.trim();
    this.searchTried.set(true);
    if (!query) {
      this.searchResults.set([]);
      return;
    }
    this.searchLoading.set(true);
    try {
      const results = await firstValueFrom(this.corrosionService.globalSearch(query, 12));
      this.searchResults.set(results);
    } finally {
      this.searchLoading.set(false);
    }
  }

  async openSearchResult(result: GlobalSearchResult): Promise<void> {
    this.searchResults.set([]);
    await this.router.navigateByUrl(result.route);
  }
}
