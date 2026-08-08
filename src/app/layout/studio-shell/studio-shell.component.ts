import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  logout(): void {
    this.auth.logout();
  }
}
