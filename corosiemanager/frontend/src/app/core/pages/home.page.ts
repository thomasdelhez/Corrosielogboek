import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CorrosionService } from '../../areas/corrosion/services/corrosion.service';
import { GlobalSearchResult } from '../../areas/corrosion/models/corrosion.models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusPillComponent } from '../../shared/components/status-pill.component';
import { ToastService } from '../../shared/services/toast.service';
import { PermissionService } from '../security/services/permission.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, FormsModule, PageHeaderComponent, EmptyStateComponent, StatusPillComponent],
  template: `
    <main class="ui-page">
      <section class="hero ui-surface">
        <div class="ui-surface-inner">
          <app-page-header
            eyebrow="F35 Corrosie Logboek"
            title="Operationeel overzicht"
            subtitle="Navigeer direct naar de juiste werkstroom, zoek door onderhoudsdata en houd focus op de volgende actie."
          >
            @if (isLoggedIn()) {
              <a class="ui-btn-secondary" routerLink="/account">Mijn account</a>
              <button class="ui-btn-ghost" type="button" (click)="logout()">Uitloggen</button>
            } @else {
              <a class="ui-btn" routerLink="/login">Naar login</a>
            }
          </app-page-header>

          <div class="hero-grid">
            <section class="hero-panel ui-section">
              <div class="ui-section-inner ui-stack-md">
                <div class="ui-inline-list">
                  @if (isLoggedIn()) {
                    <app-status-pill [label]="userLabel()" state="brand" />
                    <span class="ui-chip">{{ roleHeading() }}</span>
                  } @else {
                    <span class="ui-chip">Niet ingelogd</span>
                  }
                </div>

                @if (authMessage()) {
                  <div class="ui-banner info">
                    <span>{{ authMessage() }}</span>
                  </div>
                }

                @if (isLoggedIn()) {
                  <div class="task-card">
                    <p class="card-label">Jouw focus</p>
                    <ul class="task-list">
                      @for (item of roleTasks(); track item) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  </div>
                } @else {
                  <app-empty-state
                    eyebrow="Toegang"
                    title="Log in om werkstromen te openen"
                    description="Na het inloggen krijg je directe toegang tot jouw modules, zoekfunctie en snellinks."
                  >
                    <a class="ui-btn" routerLink="/login">Login openen</a>
                  </app-empty-state>
                }
              </div>
            </section>

            <section class="search-card ui-section">
              <div class="ui-section-inner ui-stack-md">
                <div>
                  <p class="card-label">Direct zoeken</p>
                  <h2>Aircraft, panel, hole of MDR</h2>
                  <p class="ui-meta">Gebruik één zoekveld om direct naar de juiste case of workflow te springen.</p>
                </div>
                <form class="search-form" (ngSubmit)="runGlobalSearch()">
                  <input
                    class="ui-input"
                    [(ngModel)]="globalSearchQuery"
                    name="globalSearchQuery"
                    placeholder="Bijv. AN 10, panel 190, hole 123, MDR-001"
                  />
                  <button class="ui-btn" type="submit" [disabled]="searchLoading()">
                    {{ searchLoading() ? 'Zoeken...' : 'Zoeken' }}
                  </button>
                </form>
                @if (searchResults().length > 0) {
                  <div class="search-results">
                    @for (result of searchResults(); track result.route + result.title) {
                      <button class="result-item" type="button" (click)="openSearchResult(result)">
                        <app-status-pill [label]="result.kind" state="brand" />
                        <strong>{{ result.title }}</strong>
                        @if (result.subtitle) {
                          <span class="ui-meta">{{ result.subtitle }}</span>
                        }
                      </button>
                    }
                  </div>
                } @else if (searchTried() && !searchLoading()) {
                  <app-empty-state
                    eyebrow="Zoekresultaten"
                    title="Geen resultaten gevonden"
                    description="Probeer een andere aircraftcode, hole, panelnummer of MDR-referentie."
                  />
                }
              </div>
            </section>
          </div>
        </div>
      </section>

      @if (isLoggedIn()) {
        <section class="quick-strip ui-section">
          <div class="ui-section-inner">
            <div class="strip-head">
              <div>
                <p class="card-label">Snelle acties</p>
                <h2>Ga direct naar je meest gebruikte schermen</h2>
              </div>
            </div>
            <div class="quick-actions">
              @for (action of quickActions(); track action.label) {
                <a class="quick-link" [routerLink]="action.path" [queryParams]="action.queryParams ?? null">
                  <strong>{{ action.label }}</strong>
                  <span>Open workflow</span>
                </a>
              }
            </div>
          </div>
        </section>
      }

      <section class="feature-grid">
        <article class="feature feature-primary ui-section">
          <div class="ui-section-inner">
            <p class="card-label">Core workflow</p>
            <h3>Aircraft & Panels</h3>
            <p>Selecteer aircraft, open panels en beheer holes vanuit het centrale overzicht.</p>
            <div class="ui-actions">
              <a class="ui-btn" routerLink="/corrosion">Open workflow</a>
              <a class="ui-btn-secondary" routerLink="/admin/aircraft-beheer">Aircraft beheer</a>
            </div>
          </div>
        </article>

        @if (canUseMdr()) {
          <article class="feature ui-section">
            <div class="ui-section-inner">
              <p class="card-label">Review</p>
              <h3>MDR Management</h3>
              <p>Status, cases en request details in één reviewflow.</p>
              <a class="ui-btn-secondary" routerLink="/mdr">Open MDR</a>
            </div>
          </article>
        }

        @if (canUseNdi()) {
          <article class="feature ui-section">
            <div class="ui-section-inner">
              <p class="card-label">Review</p>
              <h3>NDI Reports</h3>
              <p>Onderhoud de NDI-workflow en werk rapporten gecontroleerd bij.</p>
              <a class="ui-btn-secondary" routerLink="/ndi">Open NDI</a>
            </div>
          </article>
        }

        <article class="feature ui-section">
          <div class="ui-section-inner">
            <p class="card-label">Supply</p>
            <h3>Ordering</h3>
            <p>Volg onderdelen, orderstatus en leverstatus zonder contextwissels.</p>
            <a class="ui-btn-secondary" routerLink="/ordering">Open tracker</a>
          </div>
        </article>

        <article class="feature ui-section">
          <div class="ui-section-inner">
            <p class="card-label">Queue control</p>
            <h3>Inspectie & Installatie</h3>
            <p>Werk inspectie, trackers en installatie in samenhang af.</p>
            <div class="ui-actions">
              <a class="ui-btn-secondary" routerLink="/inspection">Inspectie</a>
              <a class="ui-btn-secondary" routerLink="/trackers">Trackers</a>
              <a class="ui-btn-secondary" routerLink="/installation">Installatie</a>
            </div>
          </div>
        </article>

        @if (canUseAdmin()) {
          <article class="feature ui-section">
            <div class="ui-section-inner">
              <p class="card-label">Beheer</p>
              <h3>Admin</h3>
              <p>Beheer gebruikers, rollen en operationele toegang.</p>
              <a class="ui-btn-secondary" routerLink="/admin/users">Gebruikers beheren</a>
            </div>
          </article>
        }

        <article class="feature ui-section">
          <div class="ui-section-inner">
            <p class="card-label">Rapportage</p>
            <h3>Corrosion reports</h3>
            <p>Open exports en reviewdata voor opvolging en overdracht.</p>
            <a class="ui-btn-secondary" routerLink="/reports/corrosion-tracker">Open rapportage</a>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: `
    .hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-top:24px}
    .hero-panel,.search-card{overflow:hidden}
    .task-card{
      padding:18px;border-radius:18px;background:linear-gradient(180deg, rgba(21,94,239,.06), rgba(255,255,255,.92));
      border:1px solid rgba(21,94,239,.12);
    }
    .task-list{margin:0;padding-left:18px;display:grid;gap:8px}
    .card-label{margin:0 0 8px;color:var(--color-brand);font-size:.76rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .search-card h2,.quick-strip h2{margin:0 0 8px;font:700 1.35rem/1.1 var(--font-heading);color:var(--color-ink-strong)}
    .search-form{display:flex;flex-wrap:wrap;gap:10px}
    .search-form .ui-input{flex:1;min-width:240px}
    .search-results{display:grid;gap:10px}
    .result-item{
      border:1px solid var(--color-line);border-radius:16px;background:#fff;padding:14px;text-align:left;display:grid;gap:8px;cursor:pointer;
      transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;
    }
    .result-item:hover{transform:translateY(-1px);border-color:rgba(21,94,239,.22);box-shadow:var(--shadow-panel)}
    .quick-strip{overflow:hidden}
    .strip-head{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
    .quick-link{
      display:grid;gap:4px;padding:16px;border-radius:18px;text-decoration:none;background:linear-gradient(180deg,#fff, #f6f9fc);
      border:1px solid var(--color-line);box-shadow:var(--shadow-panel);
    }
    .quick-link strong{color:var(--color-ink-strong)}
    .quick-link span{color:var(--color-ink-muted)}
    .feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .feature{overflow:hidden}
    .feature-primary{grid-column:span 2;background:linear-gradient(135deg, rgba(21,94,239,.08), rgba(255,255,255,.94))}
    .feature h3{margin:0 0 8px;font:700 1.16rem/1.1 var(--font-heading);color:var(--color-ink-strong)}
    .feature p{margin:0 0 16px;color:var(--color-ink-muted);line-height:1.45}
    @media (max-width:1100px){
      .hero-grid,.feature-grid{grid-template-columns:1fr}
      .feature-primary{grid-column:auto}
      .quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media (max-width:720px){
      .quick-actions{grid-template-columns:1fr}
    }
  `,
})
export class HomePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);
  private readonly corrosionService = inject(CorrosionService);
  private readonly toast = inject(ToastService);

  protected globalSearchQuery = '';
  protected readonly searchLoading = signal(false);
  protected readonly searchResults = signal<GlobalSearchResult[]>([]);
  protected readonly searchTried = signal(false);

  protected isLoggedIn(): boolean {
    return !!this.auth.currentUser();
  }

  protected authMessage(): string | null {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'role_required') return 'Je account heeft geen toegang tot de gevraagde module.';
    if (reason === 'account_updated') return 'Je account is bijgewerkt.';
    return null;
  }

  protected userLabel(): string {
    return this.auth.currentUser()?.username ?? 'Gast';
  }

  protected roleHeading(): string {
    const role = this.auth.currentUser()?.roles[0];
    if (role === 'admin') return 'Administratie en review';
    if (role === 'reviewer') return 'Review en besluitvorming';
    return 'Engineering en uitvoering';
  }

  protected roleTasks(): string[] {
    const role = this.auth.currentUser()?.roles[0];
    if (role === 'admin') {
      return [
        'Controleer gebruikers- en rolwijzigingen.',
        'Houd MDR en NDI doorlooptijden scherp in de gaten.',
        'Gebruik rapportages voor overdracht en kwaliteitscontrole.',
      ];
    }
    if (role === 'reviewer') {
      return [
        'Werk reviewqueues af en controleer statusovergangen.',
        'Controleer MDR-cases en NDI-rapporten op volledigheid.',
        'Gebruik rapportages om open acties te prioriteren.',
      ];
    }
    return [
      'Open het corrosie-overzicht en werk paneldata gericht bij.',
      'Volg ordering en installatie zonder contextwissels.',
      'Gebruik de zoekfunctie om direct naar de juiste hole te springen.',
    ];
  }

  protected quickActions(): Array<{ label: string; path: string; queryParams?: Record<string, string> }> {
    const base = [
      { label: 'Corrosie workflow', path: '/corrosion' },
      { label: 'Ordering tracker', path: '/ordering' },
      { label: 'Inspectie queue', path: '/inspection' },
    ];

    if (this.permissions.canAccessReviewerArea(this.auth.currentUser())) {
      base.push({ label: 'MDR board', path: '/mdr' }, { label: 'NDI board', path: '/ndi' });
    }

    return base;
  }

  protected canUseMdr(): boolean {
    return this.permissions.canAccessReviewerArea(this.auth.currentUser());
  }

  protected canUseNdi(): boolean {
    return this.permissions.canAccessReviewerArea(this.auth.currentUser());
  }

  protected canUseAdmin(): boolean {
    return this.permissions.canAccessAdminArea(this.auth.currentUser());
  }

  protected async logout(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
  }

  protected async runGlobalSearch(): Promise<void> {
    this.searchTried.set(true);
    const query = this.globalSearchQuery.trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    this.searchLoading.set(true);
    try {
      this.searchResults.set(await firstValueFrom(this.corrosionService.globalSearch(query)));
    } catch {
      this.toast.error('Zoeken mislukt.');
    } finally {
      this.searchLoading.set(false);
    }
  }

  protected async openSearchResult(result: GlobalSearchResult): Promise<void> {
    await this.router.navigateByUrl(result.route);
  }
}
