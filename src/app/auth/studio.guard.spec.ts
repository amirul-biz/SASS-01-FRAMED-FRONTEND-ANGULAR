import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { ENVIRONMENT } from '../core/environment.token';
import { FIREBASE_AUTH } from '../core/firebase';
import { AuthService } from './auth.service';
import { studioGuard } from './studio.guard';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, handler: (user: unknown) => void) => {
    handler(null);
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

describe('studioGuard', () => {
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
      studioGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('allows access for a photographer', async () => {
    await auth.ready;
    auth.currentUser.set({
      name: 'Jane',
      email: 'jane@example.com',
      role: 'photographer',
    });
    expect(await runGuard()).toBe(true);
  });

  it('redirects to /login for an admin', async () => {
    await auth.ready;
    auth.currentUser.set({
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(await runGuard()).not.toBe(true);
  });

  it('redirects to /login when unauthenticated', async () => {
    await auth.ready;
    expect(await runGuard()).not.toBe(true);
  });
});
