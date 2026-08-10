import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
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

  readonly profileLink = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'photographer') {
      return '/studio';
    }
    if (role === 'admin') {
      return '/admin';
    }
    return '/login';
  });
}
