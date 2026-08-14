import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_AUTH } from './firebase';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(FIREBASE_AUTH);
  const authService = inject(AuthService);

  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return next(req);
  }

  return from(firebaseUser.getIdToken()).pipe(
    switchMap((idToken) =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } })),
    ),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        void authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
