import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, finalize, switchMap } from 'rxjs';
import { RangePipe } from '../../shared/pipes/range.pipe';
import { formatCurrency } from '../../pricing/currency.util';
import { COUNTRY_DIAL_CODE } from '../../checkout/country-code.constants';
import { Event, StudioEventsService } from '../studio-events.service';
import { OrderStatus, PaginatedOrders, StudioOrder, StudioOrdersService } from '../studio-orders.service';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING_CONFIRMATION', label: 'Pending confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'bg-surface-container text-on-surface-variant',
  CONFIRMED: 'bg-secondary-container text-on-secondary-container',
  CANCELLED: 'bg-error-container text-error',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Pending confirmation',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

@Component({
  selector: 'app-orders-list',
  imports: [RangePipe, DatePipe],
  templateUrl: './orders-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersListComponent {
  private readonly ordersService = inject(StudioOrdersService);
  private readonly eventsService = inject(StudioEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadTrigger$ = new Subject<void>();

  readonly formatCurrency = formatCurrency;
  readonly countryDialCode = COUNTRY_DIAL_CODE;
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusBadgeClass = STATUS_BADGE_CLASS;
  readonly statusLabel = STATUS_LABEL;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly pageNumber = signal(1);
  readonly pageSize = signal(PAGE_SIZE_OPTIONS[0]);
  readonly eventFilter = signal<string>('');
  readonly statusFilter = signal<OrderStatus | ''>('');
  readonly response = signal<PaginatedOrders | null>(null);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly expandedIds = signal<Set<string>>(new Set());
  readonly myEvents = signal<Event[]>([]);

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMsg.set(null);
          return this.ordersService
            .listOrders(
              this.pageNumber(),
              this.pageSize(),
              this.eventFilter() || undefined,
              this.statusFilter() || undefined,
            )
            .pipe(finalize(() => this.isLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => this.errorMsg.set('Failed to load your orders. Please try again.'),
      });

    this.loadTrigger$.next();

    // Populate the event filter dropdown — a single page is enough for a filter list.
    this.eventsService.listMyEvents(1, 100).subscribe({
      next: (response) => this.myEvents.set(response.items),
      error: () => {},
    });
  }

  onEventFilterChange(event: globalThis.Event): void {
    this.eventFilter.set((event.target as HTMLSelectElement).value);
    this.pageNumber.set(1);
    this.loadTrigger$.next();
  }

  onStatusFilterChange(event: globalThis.Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as OrderStatus | '');
    this.pageNumber.set(1);
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

  isExpanded(orderId: string): boolean {
    return this.expandedIds().has(orderId);
  }

  toggleExpanded(orderId: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    this.expandedIds.set(next);
  }

  hasActiveFilters(): boolean {
    return this.eventFilter() !== '' || this.statusFilter() !== '';
  }

  customerPhone(order: StudioOrder): string {
    return `${this.countryDialCode[order.countryCode]} ${order.phone}`;
  }
}
