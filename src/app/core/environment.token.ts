import { InjectionToken } from '@angular/core';

export interface Environment {
  production: boolean;
  apiUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export const ENVIRONMENT = new InjectionToken<Environment>('Environment');
