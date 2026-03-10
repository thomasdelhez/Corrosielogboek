import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { AuthenticationService } from './core/security/services/authentication.service';

describe('App', () => {
  const authService = {
    restoreFromStorage: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AuthenticationService, useValue: authService }],
    }).compileComponents();
  });

  beforeEach(() => {
    authService.restoreFromStorage.mockClear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('restores auth session on boot', () => {
    TestBed.createComponent(App);
    expect(authService.restoreFromStorage).toHaveBeenCalledTimes(1);
  });
});
