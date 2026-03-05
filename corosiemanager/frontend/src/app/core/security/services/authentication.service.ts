import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthenticatedUser {
  username: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly _user$ = new BehaviorSubject<AuthenticatedUser | null>(null);
  readonly user$ = this._user$.asObservable();

  setUser(user: AuthenticatedUser | null): void {
    this._user$.next(user);
  }
}
