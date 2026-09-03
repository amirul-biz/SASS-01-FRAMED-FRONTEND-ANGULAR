import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Role } from '../../auth/auth.service';
import { SelectionService } from '../../pricing/selection.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  readonly selection = inject(SelectionService);

  // Mobile hamburger panel — there is no other viewport at which this nav needs to be open,
  // so a plain signal (no route-close subscription) is enough; each link closes it on click.
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  readonly profileLink = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.Photographer) {
      return '/studio';
    }
    if (role === Role.Admin) {
      return '/admin';
    }
    return '/login';
  });
}
