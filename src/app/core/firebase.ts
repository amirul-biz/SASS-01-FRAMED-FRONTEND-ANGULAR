import { inject, InjectionToken, Provider } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { ENVIRONMENT } from './environment.token';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth');

export function provideFirebase(): Provider[] {
  return [
    {
      provide: FIREBASE_APP,
      useFactory: () => initializeApp(inject(ENVIRONMENT).firebase),
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: () => getAuth(inject(FIREBASE_APP)),
    },
  ];
}
