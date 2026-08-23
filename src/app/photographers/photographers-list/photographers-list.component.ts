import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ClientService, ClientTopPhotographer } from '../../client/client.service';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants/search.constants';
import { PhotographerCardComponent } from '../photographer-card/photographer-card.component';

type SortOption = 'events' | 'az';

@Component({
  selector: 'app-photographers-list',
  imports: [PhotographerCardComponent],
  templateUrl: './photographers-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographersListComponent {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  private readonly results = signal<ClientTopPhotographer[]>([]);
  readonly sortBy = signal<SortOption>('events');
  readonly isLoading = signal(true);

  readonly photographers = computed(() => {
    const list = this.results();
    if (this.sortBy() === 'az') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  });

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.loadPhotographers(value));

    this.loadPhotographers('');
  }

  onQueryChange(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  private loadPhotographers(search: string): void {
    this.isLoading.set(true);
    this.clientService
      .getPhotographers(search || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (photographers) => {
          this.results.set(photographers);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }
}
