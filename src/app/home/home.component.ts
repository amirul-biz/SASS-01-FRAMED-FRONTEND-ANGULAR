import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ClientService, ClientTopPhotographer } from '../client/client.service';
import { toEventCard } from '../client/client-event.util';
import { IEvent } from '../events/events.service';
import { EventCardComponent } from '../shared/event-card/event-card.component';

const PHOTOGRAPHER_AVATAR_FALLBACK_BASE = 'https://i.pravatar.cc/150?u=';

@Component({
  selector: 'app-home',
  imports: [RouterLink, EventCardComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly latestEvents = signal<IEvent[]>([]);
  readonly topPhotographers = signal<ClientTopPhotographer[]>([]);

  constructor() {
    this.clientService
      .getHome()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (home) => {
          this.latestEvents.set(home.latestEvents.map(toEventCard));
          this.topPhotographers.set(home.topPhotographers);
        },
        error: () => undefined,
      });
  }

  photographerAvatarUrl(photographer: ClientTopPhotographer): string {
    return photographer.profileImageUrl ?? `${PHOTOGRAPHER_AVATAR_FALLBACK_BASE}${photographer.id}`;
  }

  searchByPlate(plate: string): void {
    // Cross-event plate search isn't modeled yet — send riders to browse events instead.
    void plate;
    this.router.navigate(['/events']);
  }
}
