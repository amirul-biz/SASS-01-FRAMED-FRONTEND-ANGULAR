import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  AdminPaymentOptionReview,
  AdminPaymentsService,
  ApprovalStatus,
  PaymentProvider,
} from '../admin-payments.service';

@Component({
  selector: 'app-admin-payment-approvals',
  imports: [DatePipe],
  templateUrl: './admin-payment-approvals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentApprovalsComponent {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions: { value: ApprovalStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly providerOptions: { value: PaymentProvider | ''; label: string }[] = [
    { value: '', label: 'All providers' },
    { value: 'TOYYIBPAY', label: 'ToyyibPay' },
    { value: 'STRIPE', label: 'Stripe' },
    { value: 'CASH', label: 'Cash' },
  ];

  readonly rows = signal<AdminPaymentOptionReview[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly statusFilter = signal<ApprovalStatus | ''>('PENDING');
  readonly providerFilter = signal<PaymentProvider | ''>('');
  readonly decidingId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.paymentsService
      .getPaymentOptionsForReview({
        status: this.statusFilter() || undefined,
        provider: this.providerFilter() || undefined,
        pageSize: 100,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.rows.set(response.items),
        error: () => this.errorMsg.set('Failed to load payment options. Please try again.'),
      });
  }

  onStatusFilterChange(event: globalThis.Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as ApprovalStatus | '');
    this.load();
  }

  onProviderFilterChange(event: globalThis.Event): void {
    this.providerFilter.set((event.target as HTMLSelectElement).value as PaymentProvider | '');
    this.load();
  }

  decide(row: AdminPaymentOptionReview, status: 'APPROVED' | 'REJECTED'): void {
    this.decidingId.set(row.id);
    this.errorMsg.set(null);
    this.paymentsService
      .setPaymentOptionApproval(row.id, status)
      .pipe(
        finalize(() => this.decidingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) =>
          this.rows.update((list) => list.map((r) => (r.id === updated.id ? updated : r))),
        // Approving a ToyyibPay option re-checks its credentials, so a 400 carries the reason.
        error: (error) =>
          this.errorMsg.set(
            typeof error?.error?.message === 'string'
              ? error.error.message
              : 'Failed to record the decision. Please try again.',
          ),
      });
  }

  statusBadgeClass(status: ApprovalStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-error-container text-error';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  }

  statusLabel(status: ApprovalStatus): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }
}