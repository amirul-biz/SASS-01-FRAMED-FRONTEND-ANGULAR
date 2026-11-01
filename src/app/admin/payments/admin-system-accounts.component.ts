import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminPaymentsService, AdminSystemPaymentAccount } from '../admin-payments.service';

@Component({
  selector: 'app-admin-system-accounts',
  imports: [DatePipe],
  templateUrl: './admin-system-accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSystemAccountsComponent {
  private readonly paymentsService = inject(AdminPaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly accounts = signal<AdminSystemPaymentAccount[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);
  // null = create ToyyibPay account, else editing that account's id.
  readonly editingId = signal<string | null>(null);

  readonly username = signal('');
  readonly secretKey = signal('');
  readonly categoryCode = signal('');
  readonly isDefault = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.paymentsService
      .getSystemAccounts()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (accounts) => this.accounts.set(accounts),
        error: () => this.errorMsg.set('Failed to load system accounts. Please try again.'),
      });
  }

  flash(message: string): void {
    this.successMsg.set(message);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  openCreateToyyibPay(): void {
    this.editingId.set(null);
    this.username.set('');
    this.secretKey.set('');
    this.categoryCode.set('');
    // First ToyyibPay account defaults on the backend when omitted — pre-tick for convenience.
    this.isDefault.set(this.accounts().every((account) => account.provider !== 'TOYYIBPAY'));
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  openEditToyyibPay(account: AdminSystemPaymentAccount): void {
    this.editingId.set(account.id);
    this.username.set(account.username ?? '');
    this.secretKey.set('');
    this.categoryCode.set(account.categoryCode ?? '');
    this.isDefault.set(account.isDefault);
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

  async addCashAccount(): Promise<void> {
    this.isSaving.set(true);
    this.errorMsg.set(null);
    this.paymentsService
      .createCashSystemAccount()
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.flash('Cash account created.');
          this.load();
        },
        error: (error) => {
          const message = error?.error?.message;
          this.errorMsg.set(
            Array.isArray(message) ? message.join(' ') : 'Failed to create the cash account.',
          );
        },
      });
  }

  submitToyyibPayForm(): void {
    const isEdit = this.editingId() !== null;
    const username = this.username().trim();
    const secretKey = this.secretKey().trim();
    const categoryCode = this.categoryCode().trim();

    if (!isEdit && !username) {
      this.formError.set('Username is required.');
      return;
    }
    if (!isEdit && !secretKey) {
      this.formError.set('Secret key is required.');
      return;
    }
    if (!isEdit && !categoryCode) {
      this.formError.set('Category code is required to verify the account.');
      return;
    }
    if (isEdit && !username && !secretKey && !categoryCode && !this.isDefault()) {
      this.formError.set('Nothing to update.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    const request$ = isEdit
      ? this.paymentsService.updateToyyibPaySystemAccount(this.editingId()!, {
          ...(username && { username }),
          ...(secretKey && { secretKey }),
          ...(categoryCode && { categoryCode }),
          isDefault: this.isDefault(),
        })
      : this.paymentsService.createToyyibPaySystemAccount({
          username,
          secretKey,
          categoryCode,
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
          this.flash(isEdit ? 'ToyyibPay account updated.' : 'ToyyibPay account created.');
          this.load();
        },
        error: (error) => {
          const message = error?.error?.message;
          this.formError.set(
            Array.isArray(message)
              ? message.join(' ')
              : typeof message === 'string'
                ? message
                : 'Failed to save the account. Please try again.',
          );
        },
      });
  }
}