import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const studioGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.currentUser()?.role === Role.Photographer) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
