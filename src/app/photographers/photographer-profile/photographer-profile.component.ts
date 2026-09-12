import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
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
  private readonly router = inject(Router);
  private readonly searchInput$ = new Subject<string>();
  private readonly loadTrigger$ = new Subject<{ pageNumber: number; append: boolean }>();

  id = input.required<string>();

  readonly photographer = signal<ClientPhotographerProfile | null>(null);
  readonly isLoadingProfile = signal(true);

  readonly search = signal('');
  readonly date = signal('');
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
          if (profile.nickname && profile.nickname !== this.id()) {
            this.router.navigate(['/photographers', profile.nickname], { replaceUrl: true });
          }
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
        this.loadTrigger$.next({ pageNumber: 1, append: false });
      });

    // switchMap cancels any in-flight request when a new one starts — otherwise a slow
    // filtered request could resolve after a later "clear filter" request and overwrite
    // the correct list with stale (possibly empty) results.
    this.loadTrigger$
      .pipe(
        switchMap(({ pageNumber, append }) => {
          append ? this.isLoadingMore.set(true) : this.isLoadingEvents.set(true);
          return this.clientService
            .getEvents({
              photographerId: this.id(),
              search: this.search() || undefined,
              dateFrom: this.date() || undefined,
              dateTo: this.date() || undefined,
              pageNumber,
              pageSize: PHOTOGRAPHER_EVENTS_PAGE_SIZE,
            })
            .pipe(map((response) => ({ response, append })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ response, append }) => {
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

    this.loadTrigger$.next({ pageNumber: 1, append: false });
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

  onDateChange(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
    this.loadTrigger$.next({ pageNumber: 1, append: false });
  }

  clearDateFilter(): void {
    this.date.set('');
    this.loadTrigger$.next({ pageNumber: 1, append: false });
  }

  loadMore(): void {
    this.loadTrigger$.next({ pageNumber: this.pageNumber() + 1, append: true });
  }
}
