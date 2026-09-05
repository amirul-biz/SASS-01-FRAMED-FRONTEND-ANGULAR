import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { StudioProfileService } from './studio-profile.service';
import type { ProfileSettingsComponent } from './profile-settings/profile-settings.component';

export const studioLandingGuard: CanActivateFn = async () => {
  const profileService = inject(StudioProfileService);
  const router = inject(Router);

  try {
    const { isComplete } = await firstValueFrom(
      profileService.getProfileCompleteness(),
    );
    return router.createUrlTree([
      isComplete ? '/studio/events' : '/studio/profile-settings',
    ]);
  } catch {
    return router.createUrlTree(['/studio/events']);
  }
};

export const profileCompleteDeactivateGuard: CanDeactivateFn<
  ProfileSettingsComponent
> = async (component, _currentRoute, _currentState, nextState) => {
  // Only enforce staying put when heading to another /studio page — never
  // block auth-related navigation (login, logout, session expiry redirects).
  if (!nextState.url.startsWith('/studio')) {
    return true;
  }

  const auth = inject(AuthService);
  const profileService = inject(StudioProfileService);

  if (!auth.currentUser()) {
    return true;
  }

  try {
    const { isComplete } = await firstValueFrom(
      profileService.getProfileCompleteness(),
    );
    if (!isComplete) {
      component.errorMsg.set(
        'Please complete all required fields before leaving this page.',
      );
    }
    return isComplete;
  } catch {
    return true;
  }
};
