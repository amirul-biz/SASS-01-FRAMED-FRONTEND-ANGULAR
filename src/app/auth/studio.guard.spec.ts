import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { studioGuard } from './studio.guard';

describe('studioGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      studioGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('allows access for a photographer', () => {
    auth.login('photographer@example.com', 'x');
    expect(runGuard()).toBe(true);
  });

  it('redirects to /login for an admin', () => {
    auth.login('admin@example.com', 'x');
    expect(runGuard()).not.toBe(true);
  });

  it('redirects to /login when unauthenticated', () => {
    expect(runGuard()).not.toBe(true);
  });
});
