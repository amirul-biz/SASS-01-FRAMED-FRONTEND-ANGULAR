import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);

  readonly paymentsExpanded = signal(false);

  togglePayments(): void {
    this.paymentsExpanded.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
