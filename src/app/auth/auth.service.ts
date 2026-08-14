import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { FIREBASE_AUTH } from '../core/firebase';

export type Role = 'photographer' | 'admin';

export interface IAppUser {
  name: string;
  email: string;
  role: Role;
}

interface CurrentUserResponse {
  id: string;
  email: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly auth = inject(FIREBASE_AUTH);

  readonly currentUser = signal<IAppUser | null>(null);

  /** No per-user photographer accounts exist without a backend — every photographer session represents this seeded demo photographer. */
  readonly demoPhotographerId = 'alex-rivers';

  /** Resolves once the initial Firebase session (if any) has been restored and the app profile fetched, so guards can await it on page refresh. */
  readonly ready: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise((resolve) => (resolveReady = resolve));

    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (!firebaseUser) {
        this.currentUser.set(null);
        resolveReady();
        return;
      }
      this.loadCurrentUser(firebaseUser)
        .catch(() => this.currentUser.set(null))
        .finally(resolveReady);
    });
  }

  async login(email: string, password: string): Promise<IAppUser> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    return this.loadCurrentUser(credential.user);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  private async loadCurrentUser(firebaseUser: FirebaseUser): Promise<IAppUser> {
    const response = await firstValueFrom(
      this.http.get<CurrentUserResponse>(`${this.env.apiUrl}/users/current-user`),
    );
    const user: IAppUser = {
      name: this.nameFromEmail(firebaseUser.email ?? response.email),
      email: response.email,
      role: response.roles.includes('admin') ? 'admin' : 'photographer',
    };
    this.currentUser.set(user);
    return user;
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
