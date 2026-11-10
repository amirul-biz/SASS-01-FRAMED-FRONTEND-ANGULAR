import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const studioGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.currentUser()?.role === Role.Photographer) {
    return true;
  }
  // Carry the destination through login. Without this, a photographer clicking an
  // order link from WhatsApp (while logged out) lands on the dashboard after signing
  // in and loses the order they were sent to. Query params are preserved.
  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};
