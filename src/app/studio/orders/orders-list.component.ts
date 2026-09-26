import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, finalize, switchMap } from 'rxjs';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { RangePipe } from '../../shared/pipes/range.pipe';
import { formatCurrency } from '../../pricing/currency.util';
import { COUNTRY_DIAL_CODE } from '../../checkout/country-code.constants';
import { PaymentProvider, PaymentStatus } from '../../checkout/order.service';
import { getOrderReference } from '../../checkout/order-reference.util';
import { OrderCommissionComponent } from './commission/order-commission.component';
import { Event, StudioEventsService } from '../studio-events.service';
import {
  OrderHistory,
  OrderHistoryEntry,
  OrderStatus,
  PaginatedOrders,
  StudioOrder,
  StudioOrderItem,
  StudioOrdersService,
  TransitionSource,
} from '../studio-orders.service';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING_CONFIRMATION', label: 'Pending confirmation' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'bg-surface-container text-on-surface-variant',
  PROCESSING: 'bg-surface-container text-on-surface-variant',
  DELIVERED: 'bg-secondary-container text-on-secondary-container',
  CANCELLED: 'bg-error-container text-error',
};

const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'bg-on-surface-variant',
  PROCESSING: 'bg-on-surface-variant',
  DELIVERED: 'bg-secondary',
  CANCELLED: 'bg-error',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Pending confirmation',
  PROCESSING: 'Processing',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Unpaid',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
};

const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  CASH: 'Cash',
  TOYYIBPAY: 'ToyyibPay',
  STRIPE: 'Stripe',
};

const PAYMENT_PROVIDER_ICON: Record<PaymentProvider, string> = {
  CASH: 'payments',
  TOYYIBPAY: 'account_balance',
  STRIPE: 'credit_card',
};

const TRANSITION_SOURCE_LABEL: Record<TransitionSource, string> = {
  MANUAL: 'Recorded manually',
  WEBHOOK: 'Payment gateway',
  SYSTEM: 'System',
  CUSTOMER: 'Confirmed by customer',
};

const PAYMENT_STATUS_BADGE_CLASS: Record<PaymentStatus, string> = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  PROCESSING: 'bg-surface-container text-on-surface-variant',
  PAID: 'bg-secondary-container text-on-secondary-container',
  FAILED: 'bg-error-container text-error',
};

@Component({
  selector: 'app-orders-list',
  imports: [RangePipe, DatePipe, NgTemplateOutlet, PaginatorComponent, OrderCommissionComponent],
  templateUrl: './orders-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersListComponent {
  private readonly ordersService = inject(StudioOrdersService);
  private readonly eventsService = inject(StudioEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadTrigger$ = new Subject<void>();
  private readonly legacyLoadTrigger$ = new Subject<void>();

  readonly formatCurrency = formatCurrency;
  readonly countryDialCode = COUNTRY_DIAL_CODE;
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusBadgeClass = STATUS_BADGE_CLASS;
  readonly statusDotClass = STATUS_DOT_CLASS;
  readonly statusLabel = STATUS_LABEL;
  readonly paymentStatusLabel = PAYMENT_STATUS_LABEL;
  readonly paymentStatusBadgeClass = PAYMENT_STATUS_BADGE_CLASS;
  readonly transitionSourceLabel = TRANSITION_SOURCE_LABEL;
  readonly paymentProviderLabel = PAYMENT_PROVIDER_LABEL;
  readonly paymentProviderIcon = PAYMENT_PROVIDER_ICON;
  readonly orderReference = getOrderReference;
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
  readonly previewItem = signal<StudioOrderItem | null>(null);

  readonly legacyResponse = signal<PaginatedOrders | null>(null);
  readonly legacyPageNumber = signal(1);
  readonly legacyPageSize = signal(PAGE_SIZE_OPTIONS[0]);
  readonly isLegacyLoading = signal(true);
  readonly legacyErrorMsg = signal<string | null>(null);
  readonly isLegacyOrdersPresent = computed(() => (this.legacyResponse()?.totalItemCount ?? 0) > 0);

  readonly historyOrder = signal<StudioOrder | null>(null);
  readonly history = signal<OrderHistory | null>(null);
  readonly isHistoryLoading = signal(false);
  readonly historyError = signal<string | null>(null);

  readonly orderBeingMarkedPaid = signal<StudioOrder | null>(null);
  readonly paymentNotes = signal('');
  readonly isMarkingPaid = signal(false);
  readonly markPaidError = signal<string | null>(null);

  readonly syncingPaymentId = signal<string | null>(null);
  readonly syncFeedback = signal<{ paymentId: string; message: string; isError: boolean } | null>(null);

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMsg.set(null);
          return this.ordersService
            .listOrders({
              pageNumber: this.pageNumber(),
              pageSize: this.pageSize(),
              eventId: this.eventFilter() || undefined,
              status: this.statusFilter() || undefined,
              paymentTracking: 'TRACKED',
            })
            .pipe(finalize(() => this.isLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => this.errorMsg.set('Failed to load your orders. Please try again.'),
      });

    this.legacyLoadTrigger$
      .pipe(
        switchMap(() => {
          this.isLegacyLoading.set(true);
          this.legacyErrorMsg.set(null);
          return this.ordersService
            .listOrders({
              pageNumber: this.legacyPageNumber(),
              pageSize: this.legacyPageSize(),
              eventId: this.eventFilter() || undefined,
              paymentTracking: 'LEGACY',
            })
            .pipe(finalize(() => this.isLegacyLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.legacyResponse.set(response),
        error: () => this.legacyErrorMsg.set('Failed to load your legacy orders. Please try again.'),
      });

    this.loadTrigger$.next();
    this.legacyLoadTrigger$.next();

    // Populate the event filter dropdown — a single page is enough for a filter list.
    this.eventsService.listMyEvents(1, 100).subscribe({
      next: (response) => this.myEvents.set(response.items),
      error: () => {},
    });
  }

  onEventFilterChange(event: globalThis.Event): void {
    this.eventFilter.set((event.target as HTMLSelectElement).value);
    this.pageNumber.set(1);
    this.legacyPageNumber.set(1);
    this.loadTrigger$.next();
    this.legacyLoadTrigger$.next();
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

  onLegacyPageNumberChange(pageNumber: number): void {
    this.legacyPageNumber.set(pageNumber);
    this.legacyLoadTrigger$.next();
  }

  onLegacyPageSizeChange(pageSize: number): void {
    this.legacyPageSize.set(pageSize);
    this.legacyPageNumber.set(1);
    this.legacyLoadTrigger$.next();
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

  openPhotoPreview(item: StudioOrderItem): void {
    this.previewItem.set(item);
  }

  closePhotoPreview(): void {
    this.previewItem.set(null);
  }

  hasActiveFilters(): boolean {
    return this.eventFilter() !== '' || this.statusFilter() !== '';
  }

  customerPhone(order: StudioOrder): string {
    return `${this.countryDialCode[order.countryCode]} ${order.phone}`;
  }

  getStatusBadgeClass(order: StudioOrder): string {
    return this.statusBadgeClass[order.status];
  }

  getStatusLabel(order: StudioOrder): string {
    return this.statusLabel[order.status];
  }

  getPaymentProviderLabel(order: StudioOrder): string {
    return order.payment ? this.paymentProviderLabel[order.payment.provider] : '';
  }

  getPaymentProviderIcon(order: StudioOrder): string {
    return order.payment ? this.paymentProviderIcon[order.payment.provider] : '';
  }

  isCashPaymentPending(order: StudioOrder): boolean {
    const payment = order.payment;
    const isCashPayment = payment?.provider === 'CASH';
    const isAwaitingPayment = payment?.status === 'PENDING';
    return isCashPayment && isAwaitingPayment;
  }

  openHistory(order: StudioOrder): void {
    this.historyOrder.set(order);
    this.history.set(null);
    this.historyError.set(null);
    this.isHistoryLoading.set(true);

    this.ordersService
      .getOrderHistory(order.id)
      .pipe(finalize(() => this.isHistoryLoading.set(false)))
      .subscribe({
        next: (history) => {
          const isStillViewingThisOrder = this.historyOrder()?.id === order.id;
          if (isStillViewingThisOrder) {
            this.history.set(history);
          }
        },
        error: () => this.historyError.set('Could not load the history for this order. Please try again.'),
      });
  }

  closeHistory(): void {
    this.historyOrder.set(null);
  }

  getHistoryTitle(entry: OrderHistoryEntry): string {
    switch (entry.toPaymentStatus) {
      case 'PAID':
        return entry.source === 'MANUAL' ? 'Marked as paid' : 'Payment received';
      case 'PROCESSING':
        return 'Payment in progress';
      case 'FAILED':
        return 'Payment failed';
      default:
        return 'Payment updated';
    }
  }

  openMarkAsPaid(order: StudioOrder): void {
    this.paymentNotes.set('');
    this.markPaidError.set(null);
    this.orderBeingMarkedPaid.set(order);
  }

  closeMarkAsPaid(): void {
    if (this.isMarkingPaid()) {
      return;
    }
    this.orderBeingMarkedPaid.set(null);
  }

  onPaymentNotesInput(event: globalThis.Event): void {
    this.paymentNotes.set((event.target as HTMLTextAreaElement).value);
  }

  confirmMarkAsPaid(): void {
    const payment = this.orderBeingMarkedPaid()?.payment;
    const isMarkAsPaidUnavailable = !payment || this.isMarkingPaid();
    if (isMarkAsPaidUnavailable) {
      return;
    }

    this.isMarkingPaid.set(true);
    this.markPaidError.set(null);
    this.ordersService
      .markCashPaymentAsPaid(payment.id, this.paymentNotes().trim() || undefined)
      .pipe(finalize(() => this.isMarkingPaid.set(false)))
      .subscribe({
        next: () => {
          this.orderBeingMarkedPaid.set(null);
          this.loadTrigger$.next();
        },
        error: (error: unknown) => this.markPaidError.set(this.getMarkPaidErrorMessage(error)),
      });
  }

  private getMarkPaidErrorMessage(error: unknown): string {
    const backendMessage = (error as { error?: { message?: string } })?.error?.message;
    return backendMessage || 'Could not mark this order as paid. Please try again.';
  }

  isToyyibPayPaymentOpen(order: StudioOrder): boolean {
    const payment = order.payment;
    const isToyyibPayPayment = payment?.provider === 'TOYYIBPAY';
    const isPaymentOpen = payment?.status === 'PENDING' || payment?.status === 'PROCESSING';
    return isToyyibPayPayment && isPaymentOpen;
  }

  isSyncingPayment(order: StudioOrder): boolean {
    return order.payment !== null && this.syncingPaymentId() === order.payment.id;
  }

  getSyncFeedback(order: StudioOrder): { message: string; isError: boolean } | null {
    const payment = order.payment;
    const feedback = this.syncFeedback();
    const hasFeedbackForThisPayment = payment !== null && feedback?.paymentId === payment.id;
    return hasFeedbackForThisPayment ? { message: feedback.message, isError: feedback.isError } : null;
  }

  syncToyyibPayPayment(order: StudioOrder): void {
    const payment = order.payment;
    const isSyncUnavailable = !payment || this.syncingPaymentId() !== null;
    if (!payment || isSyncUnavailable) {
      return;
    }

    this.syncingPaymentId.set(payment.id);
    this.syncFeedback.set(null);
    this.ordersService
      .resyncToyyibPayPayment(payment.id)
      .pipe(finalize(() => this.syncingPaymentId.set(null)))
      .subscribe({
        next: (result) => {
          if (result.synced) {
            this.loadTrigger$.next();
            return;
          }
          this.syncFeedback.set({
            paymentId: payment.id,
            message: 'No update yet — ToyyibPay still shows this payment as unresolved.',
            isError: false,
          });
        },
        error: (error: unknown) =>
          this.syncFeedback.set({
            paymentId: payment.id,
            message: this.getSyncErrorMessage(error),
            isError: true,
          }),
      });
  }

  private getSyncErrorMessage(error: unknown): string {
    const backendMessage = (error as { error?: { message?: string } })?.error?.message;
    return backendMessage || 'Could not check this payment right now. Please try again.';
  }
}
