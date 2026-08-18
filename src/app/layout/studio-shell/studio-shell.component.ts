import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-studio-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './studio-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioShellComponent {
  readonly auth = inject(AuthService);

  readonly pricingExpanded = signal(
    ['/studio/pricing-bundles', '/studio/pricing-options', '/studio/vouchers'].some((path) =>
      window.location.pathname.startsWith(path),
    ),
  );

  togglePricing(): void {
    this.pricingExpanded.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
