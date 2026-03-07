import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { AuthorizationService } from '../services/authorization.service';

export const requireLoginGuard: CanActivateFn = () => {
  const auth = inject(AuthenticationService);
  const router = inject(Router);

  if (auth.currentUser()) {
    return true;
  }

  return router.parseUrl('/');
};

export const requireReviewerGuard: CanActivateFn = () => {
  const auth = inject(AuthenticationService);
  const authorization = inject(AuthorizationService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (authorization.hasRole(user, 'reviewer') || authorization.hasRole(user, 'admin')) {
    return true;
  }

  return router.parseUrl('/');
};
