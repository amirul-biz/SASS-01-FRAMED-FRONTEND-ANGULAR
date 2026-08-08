import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EventsService } from '../events.service';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

type SortOption = 'latest' | 'photographer';

@Component({
  selector: 'app-events-list',
  imports: [EventCardComponent],
  templateUrl: './events-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent {
  private readonly eventsService = inject(EventsService);
  private readonly allEvents = this.eventsService.getPublishedEvents();

  readonly locations = Array.from(new Set(this.allEvents.map((e) => e.location))).sort();

  readonly selectedLocation = signal<string>('');
  readonly sortBy = signal<SortOption>('latest');

  readonly events = computed(() => {
    const location = this.selectedLocation();
    const filtered = location ? this.allEvents.filter((e) => e.location === location) : this.allEvents;

    if (this.sortBy() === 'photographer') {
      return [...filtered].sort((a, b) => a.photographerName.localeCompare(b.photographerName));
    }
    return filtered;
  });

  onLocationChange(event: Event): void {
    this.selectedLocation.set((event.target as HTMLSelectElement).value);
  }

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  clearLocationFilter(): void {
    this.selectedLocation.set('');
  }
}
