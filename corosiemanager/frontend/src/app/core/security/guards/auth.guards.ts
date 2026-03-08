import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { AuthorizationService } from '../services/authorization.service';

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
  const authorization = inject(AuthorizationService);
  const router = inject(Router);

  return auth.validateStoredSession().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url, reason: 'login_required' },
        });
      }

      const user = auth.currentUser();
      if (authorization.hasRole(user, 'reviewer') || authorization.hasRole(user, 'admin')) {
        return true;
      }

      return router.createUrlTree(['/'], { queryParams: { reason: 'role_required' } });
    }),
  );
};

export const requireAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthenticationService);
  const authorization = inject(AuthorizationService);
  const router = inject(Router);

  return auth.validateStoredSession().pipe(
    map((ok) => {
      if (!ok) {
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url, reason: 'login_required' },
        });
      }

      const user = auth.currentUser();
      if (authorization.hasRole(user, 'admin')) {
        return true;
      }

      return router.createUrlTree(['/'], { queryParams: { reason: 'role_required' } });
    }),
  );
};
