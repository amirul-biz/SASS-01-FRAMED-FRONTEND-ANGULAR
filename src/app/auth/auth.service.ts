import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export type Role = 'photographer' | 'admin';

export interface IAppUser {
  name: string;
  email: string;
  role: Role;
}

const DEMO_ACCOUNTS: Record<string, Role> = {
  'photographer@example.com': 'photographer',
  'admin@example.com': 'admin',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  readonly currentUser = signal<IAppUser | null>(null);

  /** No per-user photographer accounts exist without a backend — every photographer session represents this seeded demo photographer. */
  readonly demoPhotographerId = 'alex-rivers';

  login(email: string, _password: string): IAppUser {
    const role = DEMO_ACCOUNTS[email.toLowerCase().trim()] ?? 'photographer';
    const user: IAppUser = { name: this.nameFromEmail(email), email, role };
    this.currentUser.set(user);
    return user;
  }

  logout(): void {
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  private nameFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const name = localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
    return name || 'Guest';
  }
}
