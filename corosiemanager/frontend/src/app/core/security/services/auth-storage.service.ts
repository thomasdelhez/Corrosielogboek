import { Injectable } from '@angular/core';

export interface StoredAuthSession {
  token: string;
  username: string;
  role: string;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USERNAME_KEY = 'auth_username';
const AUTH_ROLE_KEY = 'auth_role';

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  read(): StoredAuthSession | null {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const username = localStorage.getItem(AUTH_USERNAME_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || !username || !role) {
      return null;
    }
    return { token, username, role };
  }

  token(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  write(session: StoredAuthSession): void {
    localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    localStorage.setItem(AUTH_USERNAME_KEY, session.username);
    localStorage.setItem(AUTH_ROLE_KEY, session.role);
  }

  updateProfile(username: string, role: string): void {
    localStorage.setItem(AUTH_USERNAME_KEY, username);
    localStorage.setItem(AUTH_ROLE_KEY, role);
  }

  clear(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
  }
}
