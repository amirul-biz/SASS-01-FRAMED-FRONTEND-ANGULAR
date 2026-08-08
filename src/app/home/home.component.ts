import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EventsService } from '../events/events.service';
import { PhotographersService } from '../photographers/photographers.service';
import { EventCardComponent } from '../shared/event-card/event-card.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, EventCardComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly eventsService = inject(EventsService);
  private readonly photographersService = inject(PhotographersService);
  private readonly router = inject(Router);

  readonly latestEvents = this.eventsService.getPublishedEvents().slice(0, 3);
  readonly topPhotographers = this.photographersService
    .getPhotographers()
    .filter((p) => p.status === 'active')
    .sort((a, b) => b.stats.eventsShot - a.stats.eventsShot)
    .slice(0, 4);

  searchByPlate(plate: string): void {
    // Cross-event plate search isn't modeled yet — send riders to browse events instead.
    void plate;
    this.router.navigate(['/events']);
  }
}
