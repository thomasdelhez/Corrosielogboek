import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from './core/security/services/authentication.service';
import { PermissionService } from './core/security/services/permission.service';
import { ToastHostComponent } from './shared/components/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthenticationService);
  private readonly permissions = inject(PermissionService);
  private readonly router = inject(Router);

  constructor() {
    this.auth.restoreFromStorage();
  }

  protected isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  protected currentUser() {
    return this.auth.currentUser();
  }

  protected canUseReviewerArea(): boolean {
    return this.permissions.canAccessReviewerArea(this.currentUser());
  }

  protected canUseAdminArea(): boolean {
    return this.permissions.canAccessAdminArea(this.currentUser());
  }

  protected async logout(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
  }
}
