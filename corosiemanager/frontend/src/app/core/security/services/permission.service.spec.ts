import { describe, expect, it } from 'vitest';
import { AuthenticatedUser } from './authentication.service';
import { AuthorizationService } from './authorization.service';
import { PermissionService } from './permission.service';

const service = new PermissionService(new AuthorizationService());

const user = (role: 'engineer' | 'reviewer' | 'admin'): AuthenticatedUser => ({
  username: role,
  roles: [role],
});

describe('PermissionService', () => {
  it('enforces MDR edit vs transition split', () => {
    expect(service.canMdrEdit(user('engineer'))).toBe(true);
    expect(service.canMdrTransition(user('engineer'))).toBe(false);

    expect(service.canMdrEdit(user('reviewer'))).toBe(false);
    expect(service.canMdrTransition(user('reviewer'))).toBe(true);

    expect(service.canMdrEdit(user('admin'))).toBe(true);
    expect(service.canMdrTransition(user('admin'))).toBe(true);
  });

  it('restricts delete actions to admin', () => {
    expect(service.canMdrDelete(user('engineer'))).toBe(false);
    expect(service.canMdrDelete(user('reviewer'))).toBe(false);
    expect(service.canMdrDelete(user('admin'))).toBe(true);
  });

  it('supports reviewer/admin area checks', () => {
    expect(service.canAccessReviewerArea(user('engineer'))).toBe(false);
    expect(service.canAccessReviewerArea(user('reviewer'))).toBe(true);
    expect(service.canAccessReviewerArea(user('admin'))).toBe(true);
  });
});
