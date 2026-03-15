import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PermissionService } from '../security/services/permission.service';
import { AuthenticationService } from '../security/services/authentication.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);

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
}
