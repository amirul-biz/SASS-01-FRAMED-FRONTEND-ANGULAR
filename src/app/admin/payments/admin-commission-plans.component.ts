import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  AdminCommissionPlan,
  AdminPaymentsService,
  CommissionType,
  PaymentProvider,
} from '../admin-payments.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { formatCurrency } from '../../pricing/currency.util';

const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  PERCENTAGE_PER_TRANSACTION: '% per transaction',
  AMOUNT_PER_TRANSACTION: 'RM per transaction',
  PERCENTAGE_PER_UNIT: '% per photo',
  AMOUNT_PER_UNIT: 'RM per photo',
};

@Component({
  selector: 'app-admin-commission-plans',
  imports: [DatePipe, ConfirmDialogComponent],
  templateUrl: './admin-commission-plans.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCommissionPlansComponent {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly typeLabel = COMMISSION_TYPE_LABELS;
  readonly typeOptions = Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => ({
    value: value as CommissionType,
    label,
  }));

  readonly plans = signal<AdminCommissionPlan[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly deleteTarget = signal<AdminCommissionPlan | null>(null);
  readonly isDeleting = signal(false);

  // Editable fields. `type` and `provider` are fixed after creation, so on edit they only
  // drive the read-only hint in the modal.
  readonly name = signal('');
  readonly type = signal<CommissionType>('PERCENTAGE_PER_TRANSACTION');
  readonly provider = signal<PaymentProvider | ''>('');
  readonly value = signal('');
  readonly isDefault = signal(false);
  readonly isActive = signal(true);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.paymentsService
      .getCommissionPlans()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (plans) => this.plans.set(plans),
        error: () => this.errorMsg.set('Failed to load commission plans. Please try again.'),
      });
  }

  flash(message: string): void {
    this.successMsg.set(message);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  providerLabel(provider: PaymentProvider | null): string {
    if (!provider) {
      return 'Any provider';
    }
    return provider === 'TOYYIBPAY' ? 'ToyyibPay' : provider === 'CASH' ? 'Cash' : 'Stripe';
  }

  valueLabel(plan: AdminCommissionPlan): string {
    return plan.type.startsWith('PERCENTAGE') ? `${plan.value}%` : formatCurrency(plan.value);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.name.set('');
    this.type.set('PERCENTAGE_PER_TRANSACTION');
    this.provider.set('');
    this.value.set('');
    this.isDefault.set(false);
    this.isActive.set(true);
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(plan: AdminCommissionPlan): void {
    this.editingId.set(plan.id);
    this.name.set(plan.name);
    this.type.set(plan.type);
    this.provider.set(plan.provider ?? '');
    this.value.set(String(plan.value));
    this.isDefault.set(plan.isDefault);
    this.isActive.set(plan.isActive);
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) {
      return;
    }
    this.isModalOpen.set(false);
    this.formError.set(null);
  }

  submit(): void {
    const name = this.name().trim();
    const value = Number(this.value());
    const isEdit = this.editingId() !== null;

    if (!name) {
      this.formError.set('Name is required.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      this.formError.set('Value must be a number greater than 0.');
      return;
    }
    if (this.type().startsWith('PERCENTAGE') && value > 100) {
      this.formError.set('Percentage value cannot exceed 100.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    const request$ = isEdit
      ? this.paymentsService.updateCommissionPlan(this.editingId()!, {
          name,
          value,
          isDefault: this.isDefault(),
          isActive: this.isActive(),
        })
      : this.paymentsService.createCommissionPlan({
          name,
          type: this.type(),
          value,
          ...(this.provider() && { provider: this.provider() as PaymentProvider }),
          ...(this.isDefault() && { isDefault: true }),
        });

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isModalOpen.set(false);
          this.flash(isEdit ? 'Plan updated.' : 'Plan created.');
          this.load();
        },
        error: (error) => {
          const message = error?.error?.message;
          this.formError.set(
            Array.isArray(message) ? message.join(' ') : 'Failed to save the plan. Please try again.',
          );
        },
      });
  }
}