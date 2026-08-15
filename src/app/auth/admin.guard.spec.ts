import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { ENVIRONMENT } from '../core/environment.token';
import { FIREBASE_AUTH } from '../core/firebase';
import { adminGuard } from './admin.guard';
import { AuthService, Role } from './auth.service';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, handler: (user: unknown) => void) => {
    handler(null);
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

describe('adminGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FIREBASE_AUTH, useValue: {} },
        {
          provide: ENVIRONMENT,
          useValue: {
            apiUrl: 'http://api.test',
            production: false,
            firebase: {} as never,
          },
        },
        { provide: HttpClient, useValue: { get: vi.fn() } },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('allows access for an admin', async () => {
    await auth.ready;
    auth.currentUser.set({
      name: 'Admin',
      email: 'admin@example.com',
      role: Role.Admin,
    });
    expect(await runGuard()).toBe(true);
  });

  it('redirects to /login for a photographer', async () => {
    await auth.ready;
    auth.currentUser.set({
      name: 'Jane',
      email: 'jane@example.com',
      role: Role.Photographer,
    });
    expect(await runGuard()).not.toBe(true);
  });

  it('redirects to /login when unauthenticated', async () => {
    await auth.ready;
    expect(await runGuard()).not.toBe(true);
  });
});
