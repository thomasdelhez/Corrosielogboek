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
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
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
