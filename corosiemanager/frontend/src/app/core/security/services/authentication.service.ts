import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { AppConfigService } from '../../services/app-config.service';
import { HttpService } from '../../../shared/services/http.service';

export interface AuthenticatedUser {
  username: string;
  roles: string[];
}

interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

interface LogoutResponse {
  ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = inject(HttpService);
  private readonly config = inject(AppConfigService);

  private readonly _user$ = new BehaviorSubject<AuthenticatedUser | null>(null);
  readonly user$ = this._user$.asObservable();

  setUser(user: AuthenticatedUser | null): void {
    this._user$.next(user);
  }

  currentUser(): AuthenticatedUser | null {
    return this._user$.value;
  }

  restoreFromStorage(): void {
    const username = localStorage.getItem('auth_username');
    const role = localStorage.getItem('auth_role');
    const token = localStorage.getItem('auth_token');
    if (username && role && token) {
      this.setUser({ username, roles: [role] });
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.config.apiBaseUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('auth_username', res.username);
          localStorage.setItem('auth_role', res.role);
          this.setUser({ username: res.username, roles: [res.role] });
        }),
      );
  }

  logout(): Observable<LogoutResponse> {
    const hasToken = !!localStorage.getItem('auth_token');
    const request = hasToken
      ? this.http.post<LogoutResponse>(`${this.config.apiBaseUrl}/auth/logout`, {})
      : of({ ok: true });

    return request.pipe(
      tap(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        localStorage.removeItem('auth_role');
        this.setUser(null);
      }),
    );
  }
}
