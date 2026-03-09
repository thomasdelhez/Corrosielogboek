import { Injectable } from '@angular/core';
import { AuthenticatedUser } from './authentication.service';
import { AuthorizationService } from './authorization.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private readonly authorization: AuthorizationService) {}

  isAdmin(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasRole(user, 'admin');
  }

  canAccessReviewerArea(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['reviewer', 'admin']);
  }

  canAccessAdminArea(user: AuthenticatedUser | null): boolean {
    return this.isAdmin(user);
  }

  canEditHole(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['engineer', 'admin']);
  }

  canCreateBatchHoles(user: AuthenticatedUser | null): boolean {
    return this.canEditHole(user);
  }

  canMdrEdit(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['engineer', 'admin']);
  }

  canMdrTransition(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['reviewer', 'admin']);
  }

  canMdrDelete(user: AuthenticatedUser | null): boolean {
    return this.isAdmin(user);
  }

  canMdrRequestDetailEdit(user: AuthenticatedUser | null): boolean {
    return this.canMdrEdit(user);
  }

  canMdrRequestDetailDelete(user: AuthenticatedUser | null): boolean {
    return this.isAdmin(user);
  }

  canNdiReportCreate(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['engineer', 'admin']);
  }

  canNdiTransition(user: AuthenticatedUser | null): boolean {
    return this.authorization.hasAnyRole(user, ['reviewer', 'admin']);
  }
}
