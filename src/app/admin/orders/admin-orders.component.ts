import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminEvent, AdminOrder, AdminOrderStatus, AdminService } from '../admin.service';

const STATUS_BADGE_CLASS: Record<AdminOrderStatus, string> = {
  PENDING_CONFIRMATION: 'bg-surface-container text-on-surface-variant',
  CONFIRMED: 'bg-secondary-container text-on-secondary-container',
  CANCELLED: 'bg-error-container text-error',
};

const STATUS_LABEL: Record<AdminOrderStatus, string> = {
  PENDING_CONFIRMATION: 'Pending confirmation',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe],
  templateUrl: './admin-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions: { value: AdminOrderStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'PENDING_CONFIRMATION', label: 'Pending confirmation' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];
  readonly statusBadgeClass = STATUS_BADGE_CLASS;
  readonly statusLabel = STATUS_LABEL;

  readonly orders = signal<AdminOrder[]>([]);
  readonly events = signal<AdminEvent[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly eventFilter = signal<string>('');
  readonly statusFilter = signal<AdminOrderStatus | ''>('');

  constructor() {
    this.load();
    // Event filter dropdown source — one page is plenty for a <select>.
    this.adminService
      .getEvents({ pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.events.set(response.items),
        error: () => undefined,
      });
  }

  load(): void {
    this.isLoading.set(true);
    this.adminService
      .getOrders({
        eventId: this.eventFilter() || undefined,
        status: this.statusFilter() || undefined,
        pageSize: 100,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.orders.set(response.items),
        error: () => this.errorMsg.set('Failed to load orders. Please try again.'),
      });
  }

  onEventFilterChange(event: globalThis.Event): void {
    this.eventFilter.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  onStatusFilterChange(event: globalThis.Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as AdminOrderStatus | '');
    this.load();
  }
}