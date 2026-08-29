import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, finalize, switchMap } from 'rxjs';
import { RangePipe } from '../../shared/pipes/range.pipe';
import { Event, PaginatedResponse, StudioEventsService } from '../studio-events.service';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

@Component({
  selector: 'app-my-events-dashboard',
  imports: [RouterLink, RangePipe, DatePipe],
  templateUrl: './my-events-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEventsDashboardComponent {
  private readonly eventsService = inject(StudioEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadTrigger$ = new Subject<void>();

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageNumber = signal(1);
  readonly pageSize = signal(PAGE_SIZE_OPTIONS[0]);
  readonly response = signal<PaginatedResponse<Event> | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMsg.set(null);
          return this.eventsService
            .listMyEvents(this.pageNumber(), this.pageSize())
            .pipe(finalize(() => this.isLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () =>
          this.errorMsg.set('Failed to load your events. Please try again.'),
      });

    this.loadTrigger$.next();
  }

  onPageNumberChange(pageNumber: number): void {
    this.pageNumber.set(pageNumber);
    this.loadTrigger$.next();
  }

  onPageSizeChange(event: globalThis.Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.pageNumber.set(1);
    this.loadTrigger$.next();
  }

  togglePublish(event: Event): void {
    this.eventsService
      .updateEvent(event.id, { isPublished: !event.isPublished })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadTrigger$.next(),
        error: () =>
          this.errorMsg.set('Failed to update the event. Please try again.'),
      });
  }

  deleteEvent(event: Event): void {
    if (!confirm(`Delete "${event.title}"? This can't be undone.`)) {
      return;
    }

    this.eventsService
      .deleteEvent(event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadTrigger$.next(),
        error: () =>
          this.errorMsg.set('Failed to delete the event. Please try again.'),
      });
  }

  formatCategory(category: string): string {
    return category.charAt(0) + category.slice(1).toLowerCase();
  }

  // Same day → show it once, matching how the public event card already collapses its date range.
  isSingleDay(event: Event): boolean {
    return event.eventStartDate.slice(0, 10) === event.eventEndDate.slice(0, 10);
  }
}
