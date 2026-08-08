import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PhotographersService } from '../photographers.service';
import { PhotographerCardComponent } from '../photographer-card/photographer-card.component';

type SortOption = 'events' | 'az';

@Component({
  selector: 'app-photographers-list',
  imports: [PhotographerCardComponent],
  templateUrl: './photographers-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographersListComponent {
  private readonly photographersService = inject(PhotographersService);
  private readonly allPhotographers = this.photographersService.getPhotographers().filter((p) => p.status === 'active');

  readonly query = signal('');
  readonly sortBy = signal<SortOption>('events');

  readonly photographers = computed(() => {
    const q = this.query().trim().toLowerCase();
    const filtered = q
      ? this.allPhotographers.filter(
          (p) => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
        )
      : this.allPhotographers;

    const sorted = [...filtered];
    if (this.sortBy() === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.stats.eventsShot - a.stats.eventsShot);
    }
    return sorted;
  });

  onQueryChange(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }
}
