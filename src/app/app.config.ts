import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { environment } from '../environments/environment';
import { authInterceptor } from './core/auth.interceptor';
import { ENVIRONMENT } from './core/environment.token';
import { provideFirebase } from './core/firebase';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: ENVIRONMENT, useValue: environment },
    ...provideFirebase(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
