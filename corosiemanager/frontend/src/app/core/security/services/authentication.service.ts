import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { AppConfigService } from '../../services/app-config.service';
import { HttpService } from '../../../shared/services/http.service';
import { AuthStorageService } from './auth-storage.service';

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

interface MeResponse {
  username: string;
  role: string;
}

export interface UpdateOwnAccountInput {
  currentPassword: string;
  newUsername?: string | null;
  newPassword?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = inject(HttpService);
  private readonly config = inject(AppConfigService);
  private readonly storage = inject(AuthStorageService);

  private readonly _user$ = new BehaviorSubject<AuthenticatedUser | null>(null);
  readonly user$ = this._user$.asObservable();

  setUser(user: AuthenticatedUser | null): void {
    this._user$.next(user);
  }

  currentUser(): AuthenticatedUser | null {
    return this._user$.value;
  }

  restoreFromStorage(): void {
    const session = this.storage.read();
    if (session) {
      this.setUser({ username: session.username, roles: [session.role] });
    }
  }

  validateStoredSession(): Observable<boolean> {
    if (this.currentUser()) {
      return of(true);
    }

    const token = this.storage.token();
    if (!token) {
      return of(false);
    }

    return this.http.get<MeResponse>(`${this.config.apiBaseUrl}/auth/me`).pipe(
      tap((me) => {
        this.storage.updateProfile(me.username, me.role);
        this.setUser({ username: me.username, roles: [me.role] });
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.config.apiBaseUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this.storage.write({ token: res.token, username: res.username, role: res.role });
          this.setUser({ username: res.username, roles: [res.role] });
        }),
      );
  }

  logout(): Observable<LogoutResponse> {
    const hasToken = !!this.storage.token();
    const request = hasToken
      ? this.http.post<LogoutResponse>(`${this.config.apiBaseUrl}/auth/logout`, {})
      : of({ ok: true });

    return request.pipe(
      tap(() => {
        this.clearSession();
      }),
    );
  }

  updateOwnAccount(input: UpdateOwnAccountInput): Observable<AuthenticatedUser> {
    return this.http
      .put<MeResponse>(`${this.config.apiBaseUrl}/auth/me`, {
        current_password: input.currentPassword,
        new_username: input.newUsername ?? null,
        new_password: input.newPassword ?? null,
      })
      .pipe(
        map((res) => ({ username: res.username, roles: [res.role] })),
        tap((user) => {
          this.storage.updateProfile(user.username, user.roles[0]);
          this.setUser(user);
        }),
      );
  }

  clearSession(): void {
    this.storage.clear();
    this.setUser(null);
  }
}
