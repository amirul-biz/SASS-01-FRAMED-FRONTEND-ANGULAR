import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  AdminCommissionAssignment,
  AdminCommissionPlan,
  AdminPaymentsService,
  AdminSystemPaymentAccount,
  PaymentProvider,
} from '../admin-payments.service';

@Component({
  selector: 'app-admin-commission-assignments',
  imports: [DatePipe],
  templateUrl: './admin-commission-assignments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommissionAssignmentsComponent {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly providerOptions: { value: PaymentProvider | ''; label: string }[] = [
    { value: '', label: 'All providers' },
    { value: 'TOYYIBPAY', label: 'ToyyibPay' },
    { value: 'STRIPE', label: 'Stripe' },
    { value: 'CASH', label: 'Cash' },
  ];

  readonly rows = signal<AdminCommissionAssignment[]>([]);
  readonly plans = signal<AdminCommissionPlan[]>([]);
  readonly toyyibPayAccounts = signal<AdminSystemPaymentAccount[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly providerFilter = signal<PaymentProvider | ''>('');

  readonly isAssignModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingRow = signal<AdminCommissionAssignment | null>(null);
  readonly selectedPlanId = signal('');
  readonly splitEnabled = signal(false);
  readonly selectedSplitAccountId = signal('');

  constructor() {
    this.load();
    this.paymentsService
      .getCommissionPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => this.plans.set(plans),
        error: () => undefined,
      });
    this.paymentsService
      .getSystemAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accounts) =>
          this.toyyibPayAccounts.set(accounts.filter((account) => account.provider === 'TOYYIBPAY')),
        error: () => undefined,
      });
  }

  load(): void {
    this.isLoading.set(true);
    this.paymentsService
      .getCommissionAssignments({
        provider: this.providerFilter() || undefined,
        pageSize: 100,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.rows.set(response.items),
        error: () => this.errorMsg.set('Failed to load assignments. Please try again.'),
      });
  }

  flash(message: string): void {
    this.successMsg.set(message);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  onProviderFilterChange(event: globalThis.Event): void {
    this.providerFilter.set((event.target as HTMLSelectElement).value as PaymentProvider | '');
    this.load();
  }

  openAssignModal(row: AdminCommissionAssignment): void {
    this.editingRow.set(row);
    this.selectedPlanId.set(row.commissionPlanId ?? '');
    this.splitEnabled.set(row.splitSystemAccountId !== null);
    this.selectedSplitAccountId.set(row.splitSystemAccountId ?? '');
    this.formError.set(null);
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    if (this.isSaving()) {
      return;
    }
    this.isAssignModalOpen.set(false);
    this.formError.set(null);
  }

  submitAssignment(): void {
    const row = this.editingRow();
    if (!row) {
      return;
    }
    if (!this.selectedPlanId()) {
      this.formError.set('Pick a commission plan.');
      return;
    }
    if (this.splitEnabled() && !this.selectedSplitAccountId()) {
      this.formError.set('Pick a system account to split the commission to.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    this.paymentsService
      .assignCommissionPlan(row.paymentPlatformOptionId, {
        commissionPlanId: this.selectedPlanId(),
        splitSystemAccountId: this.splitEnabled() ? this.selectedSplitAccountId() : null,
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.isAssignModalOpen.set(false);
          this.flash('Commission assignment saved.');
          this.rows.update((list) =>
            list.map((r) => (r.paymentPlatformOptionId === updated.paymentPlatformOptionId ? updated : r)),
          );
        },
        error: (error) => {
          const message = error?.error?.message;
          this.formError.set(
            Array.isArray(message) ? message.join(' ') : 'Failed to save the assignment. Please try again.',
          );
        },
      });
  }

  removeAssignment(row: AdminCommissionAssignment): void {
    if (!confirm(`Remove the commission assignment for ${row.photographerEmail}?`)) {
      return;
    }
    this.isSaving.set(true);
    this.paymentsService
      .removeCommissionAssignment(row.paymentPlatformOptionId)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.flash('Assignment removed.');
          this.load();
        },
        error: (error) => {
          const message = error?.error?.message;
          const detail = Array.isArray(message) ? message.join(' ') : message;
          this.errorMsg.set(detail ?? 'Failed to remove the assignment. Please try again.');
        },
      });
  }

  providerLabel(provider: PaymentProvider): string {
    return provider === 'TOYYIBPAY' ? 'ToyyibPay' : provider === 'CASH' ? 'Cash' : 'Stripe';
  }

  approvalBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-error-container text-error';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  }
}