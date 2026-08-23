import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { toEventCard } from '../../client/client-event.util';
import { ClientService } from '../../client/client.service';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants/search.constants';
import { IEvent } from '../events.service';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

const EVENTS_PAGE_SIZE = 30;

@Component({
  selector: 'app-events-list',
  imports: [EventCardComponent],
  templateUrl: './events-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  readonly search = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly events = signal<IEvent[]>([]);
  readonly pageNumber = signal(1);
  readonly totalPageCount = signal(1);
  readonly totalItemCount = signal(0);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.search.set(value);
        this.loadPage(1, false);
      });

    this.loadPage(1, false);
  }

  onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
    this.loadPage(1, false);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
    this.loadPage(1, false);
  }

  clearDateFilter(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.loadPage(1, false);
  }

  loadMore(): void {
    this.loadPage(this.pageNumber() + 1, true);
  }

  private loadPage(pageNumber: number, append: boolean): void {
    append ? this.isLoadingMore.set(true) : this.isLoading.set(true);
    this.clientService
      .getEvents({
        search: this.search() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        pageNumber,
        pageSize: EVENTS_PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const mapped = response.items.map(toEventCard);
          this.events.set(append ? [...this.events(), ...mapped] : mapped);
          this.pageNumber.set(response.pageNumber);
          this.totalPageCount.set(response.totalPageCount);
          this.totalItemCount.set(response.totalItemCount);
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
      });
  }
}
