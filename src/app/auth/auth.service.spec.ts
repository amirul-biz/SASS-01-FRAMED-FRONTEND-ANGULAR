import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AuthService);
  });

  it('starts logged out', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('resolves the photographer demo account by email', () => {
    const user = service.login('photographer@example.com', 'anything');
    expect(user.role).toBe('photographer');
    expect(service.currentUser()?.role).toBe('photographer');
  });

  it('resolves the admin demo account by email', () => {
    const user = service.login('admin@example.com', 'anything');
    expect(user.role).toBe('admin');
  });

  it('defaults unknown emails to the photographer role', () => {
    const user = service.login('rider@example.com', 'anything');
    expect(user.role).toBe('photographer');
  });

  it('logout clears the current user', () => {
    service.login('admin@example.com', 'anything');
    service.logout();
    expect(service.currentUser()).toBeNull();
  });
});
