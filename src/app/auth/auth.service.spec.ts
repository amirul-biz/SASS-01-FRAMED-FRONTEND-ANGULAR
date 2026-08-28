import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { FIREBASE_AUTH } from '../core/firebase';
import { AuthService, Role } from './auth.service';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, handler: (user: unknown) => void) => {
    handler(null);
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

describe('AuthService', () => {
  let service: AuthService;
  let httpGet: ReturnType<typeof vi.fn>;

  function mockGet(currentUser: unknown, profile?: unknown) {
    httpGet.mockImplementation((url: string) =>
      url.includes('current-user') ? of(currentUser) : of(profile),
    );
  }

  beforeEach(() => {
    httpGet = vi.fn();

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
        { provide: HttpClient, useValue: { get: httpGet } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('starts logged out', async () => {
    await service.ready;
    expect(service.currentUser()).toBeNull();
    expect(service.photographerId()).toBeNull();
  });

  it('resolves the admin role from the backend profile on login and leaves photographerId null', async () => {
    mockGet({ id: '1', email: 'admin@example.com', roles: ['admin'] });
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: { email: 'admin@example.com' },
    } as never);

    const user = await service.login('admin@example.com', 'secret');

    expect(user.role).toBe(Role.Admin);
    expect(service.currentUser()?.role).toBe(Role.Admin);
    expect(service.photographerId()).toBeNull();
  });

  it('resolves the photographer role and fetches the real photographer profile id', async () => {
    mockGet(
      { id: '2', email: 'jane@example.com', roles: ['photographer'] },
      { id: 'photographer-42' },
    );
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: { email: 'jane@example.com' },
    } as never);

    const user = await service.login('jane@example.com', 'secret');

    expect(user.role).toBe(Role.Photographer);
    expect(service.photographerId()).toBe('photographer-42');
  });

  it('logout clears the current user and photographerId', async () => {
    mockGet(
      { id: '2', email: 'jane@example.com', roles: ['photographer'] },
      { id: 'photographer-42' },
    );
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: { email: 'jane@example.com' },
    } as never);
    vi.mocked(signOut).mockResolvedValue(undefined);
    await service.login('jane@example.com', 'secret');

    await service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.photographerId()).toBeNull();
  });
});
