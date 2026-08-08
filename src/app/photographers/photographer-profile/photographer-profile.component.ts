import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { PhotographersService } from '../photographers.service';
import { EventsService } from '../../events/events.service';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

type SortOption = 'newest' | 'oldest' | 'popular';

@Component({
  selector: 'app-photographer-profile',
  imports: [EventCardComponent],
  templateUrl: './photographer-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerProfileComponent {
  private readonly photographersService = inject(PhotographersService);
  private readonly eventsService = inject(EventsService);

  id = input.required<string>();

  readonly photographer = computed(() => this.photographersService.getPhotographer(this.id()));
  readonly topCategory = computed(() => this.eventsService.getEventsByPhotographer(this.id())[0]?.category ?? '—');

  readonly sortBy = signal<SortOption>('newest');

  readonly events = computed(() => {
    const published = this.eventsService.getEventsByPhotographer(this.id()).filter((e) => e.status === 'published');
    const sorted = [...published];
    if (this.sortBy() === 'oldest') {
      sorted.reverse();
    } else if (this.sortBy() === 'popular') {
      sorted.sort((a, b) => b.photoCount - a.photoCount);
    }
    return sorted;
  });

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }
}
