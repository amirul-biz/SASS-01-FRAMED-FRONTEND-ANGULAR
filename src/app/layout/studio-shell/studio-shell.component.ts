import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { StudioProfileService } from '../../studio/studio-profile.service';

@Component({
  selector: 'app-studio-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './studio-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioShellComponent {
  readonly auth = inject(AuthService);
  private readonly profileService = inject(StudioProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profileImageUrl = signal<string | null>(null);
  readonly profileComplete = this.profileService.isProfileComplete;

  // Mobile sidebar drawer — hidden off-canvas below md, always visible above it (see the
  // template's md:translate-x-0). Same plain-signal pattern as layout/header's mobile menu.
  readonly sidebarOpen = signal(false);

  readonly pricingExpanded = signal(
    ['/studio/pricing-bundles', '/studio/pricing-options', '/studio/vouchers'].some((path) =>
      window.location.pathname.startsWith(path),
    ),
  );

  constructor() {
    this.profileService
      .getMyProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => this.profileImageUrl.set(profile.profileImageUrl),
        error: () => undefined,
      });

    this.profileService.refreshProfileCompleteness();
  }

  togglePricing(): void {
    this.pricingExpanded.update((v) => !v);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
