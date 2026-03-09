import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { PermissionService } from '../services/permission.service';

export const requireLoginGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthenticationService);
  const router = inject(Router);

  return auth.validateStoredSession().pipe(
    map((ok) =>
      ok
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { redirectTo: state.url, reason: 'login_required' },
          }),
    ),
  );
};

export const requireReviewerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthenticationService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  return auth.validateStoredSession().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url, reason: 'login_required' },
        });
      }

      const user = auth.currentUser();
      if (permissions.canAccessReviewerArea(user)) {
        return true;
      }

      return router.createUrlTree(['/'], { queryParams: { reason: 'role_required' } });
    }),
  );
};

export const requireAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthenticationService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  return auth.validateStoredSession().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url, reason: 'login_required' },
        });
      }

      const user = auth.currentUser();
      if (permissions.canAccessAdminArea(user)) {
        return true;
      }

      return router.createUrlTree(['/'], { queryParams: { reason: 'role_required' } });
    }),
  );
};
