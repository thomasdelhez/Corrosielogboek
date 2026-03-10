import { describe, expect, it, beforeEach } from 'vitest';
import { AuthStorageService } from './auth-storage.service';

describe('AuthStorageService', () => {
  const service = new AuthStorageService();

  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and restores a session', () => {
    service.write({ token: 'abc', username: 'engineer', role: 'engineer' });

    expect(service.token()).toBe('abc');
    expect(service.read()).toEqual({
      token: 'abc',
      username: 'engineer',
      role: 'engineer',
    });
  });

  it('clears persisted values', () => {
    service.write({ token: 'abc', username: 'engineer', role: 'engineer' });
    service.clear();

    expect(service.token()).toBeNull();
    expect(service.read()).toBeNull();
  });
});
