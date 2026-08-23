import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { formatCategory, toEventCard } from '../../client/client-event.util';
import { ClientPhotographerProfile, ClientService } from '../../client/client.service';
import { SEARCH_DEBOUNCE_MS } from '../../shared/constants/search.constants';
import { IEvent } from '../../events/events.service';
import { EventCardComponent } from '../../shared/event-card/event-card.component';

const PHOTOGRAPHER_EVENTS_PAGE_SIZE = 30;
const AVATAR_FALLBACK_BASE = 'https://i.pravatar.cc/300?u=';

@Component({
  selector: 'app-photographer-profile',
  imports: [DatePipe, EventCardComponent],
  templateUrl: './photographer-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerProfileComponent implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  id = input.required<string>();

  readonly photographer = signal<ClientPhotographerProfile | null>(null);
  readonly isLoadingProfile = signal(true);

  readonly search = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly events = signal<IEvent[]>([]);
  readonly pageNumber = signal(1);
  readonly totalPageCount = signal(1);
  readonly isLoadingEvents = signal(true);
  readonly isLoadingMore = signal(false);

  ngOnInit(): void {
    this.clientService
      .getPhotographerProfile(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.photographer.set(profile);
          this.isLoadingProfile.set(false);
        },
        error: () => this.isLoadingProfile.set(false),
      });

    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.search.set(value);
        this.loadEventsPage(1, false);
      });

    this.loadEventsPage(1, false);
  }

  topCategoryLabel(): string {
    const category = this.photographer()?.topCategory;
    return category ? formatCategory(category) : '—';
  }

  avatarUrl(): string {
    const photographer = this.photographer();
    return photographer?.profileImageUrl ?? `${AVATAR_FALLBACK_BASE}${this.id()}`;
  }

  onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
    this.loadEventsPage(1, false);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
    this.loadEventsPage(1, false);
  }

  clearDateFilter(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.loadEventsPage(1, false);
  }

  loadMore(): void {
    this.loadEventsPage(this.pageNumber() + 1, true);
  }

  private loadEventsPage(pageNumber: number, append: boolean): void {
    append ? this.isLoadingMore.set(true) : this.isLoadingEvents.set(true);
    this.clientService
      .getEvents({
        photographerId: this.id(),
        search: this.search() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        pageNumber,
        pageSize: PHOTOGRAPHER_EVENTS_PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const mapped = response.items.map(toEventCard);
          this.events.set(append ? [...this.events(), ...mapped] : mapped);
          this.pageNumber.set(response.pageNumber);
          this.totalPageCount.set(response.totalPageCount);
          this.isLoadingEvents.set(false);
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.isLoadingEvents.set(false);
          this.isLoadingMore.set(false);
        },
      });
  }
}
