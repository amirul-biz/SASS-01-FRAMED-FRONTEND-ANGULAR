import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENVIRONMENT } from '../../core/environment.token';
import { FIREBASE_AUTH } from '../../core/firebase';
import { ConsumerShellComponent } from './consumer-shell.component';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, handler: (user: unknown) => void) => {
    handler(null);
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

describe('ConsumerShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConsumerShellComponent],
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
  });

  it('renders the header and footer', () => {
    const fixture = TestBed.createComponent(ConsumerShellComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });
});
