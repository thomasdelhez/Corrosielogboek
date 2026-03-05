import { Injectable } from '@angular/core';
import { AuthenticatedUser } from './authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  hasRole(user: AuthenticatedUser | null, role: string): boolean {
    return !!user?.roles.includes(role);
  }
}
