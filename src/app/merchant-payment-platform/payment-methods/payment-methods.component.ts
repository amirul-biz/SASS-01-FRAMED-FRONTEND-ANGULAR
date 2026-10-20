import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import {
  ApprovalStatus,
  MerchantPaymentPlatformOption,
  MerchantPaymentPlatformService,
  PaymentProvider,
} from '../merchant-payment-platform.service';
import { CashPaymentPlatformService } from '../cash-payment-platform/cash-payment-platform.service';
import { ToyyibPayPaymentConfigService } from '../toyyibpay-payment-platform/toyyibpay-payment-config.service';

const APPROVAL_STATUS_BADGE_CLASS: Record<ApprovalStatus, string> = {
  PENDING: 'bg-surface-container text-on-surface-variant',
  APPROVED: 'bg-secondary-container text-on-secondary-container',
  REJECTED: 'bg-error-container text-error',
};

const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  CASH: 'Cash',
  TOYYIBPAY: 'ToyyibPay',
  STRIPE: 'Stripe',
};

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface IToyyibPayForm {
  categoryCode: FormControl<string>;
  secretKey: FormControl<string>;
  chargeFpxToCustomer: FormControl<boolean>;
  chargeToPrepaid: FormControl<boolean>;
}

function createToyyibPayForm(): FormGroup<IToyyibPayForm> {
  return new FormGroup<IToyyibPayForm>({
    categoryCode: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    secretKey: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    chargeFpxToCustomer: new FormControl(false, { nonNullable: true }),
    chargeToPrepaid: new FormControl(false, { nonNullable: true }),
  });
}

function getErrorMessage(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return DEFAULT_ERROR_MESSAGE;
}

@Component({
  selector: 'app-payment-methods',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-methods.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsComponent {
  private readonly merchantPaymentPlatformService = inject(MerchantPaymentPlatformService);
  private readonly cashPaymentPlatformService = inject(CashPaymentPlatformService);
  private readonly toyyibPayPaymentConfigService = inject(ToyyibPayPaymentConfigService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusBadgeClass = APPROVAL_STATUS_BADGE_CLASS;
  readonly statusLabel = APPROVAL_STATUS_LABEL;
  readonly providerLabel = PROVIDER_LABEL;

  readonly options = signal<MerchantPaymentPlatformOption[]>([]);
  readonly isLoading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  readonly isSavingCash = signal(false);
  readonly isShowingToyyibPayForm = signal(false);
  readonly isSavingToyyibPay = signal(false);

  readonly toyyibPayForm = createToyyibPayForm();

  readonly hasCashOption = computed(() =>
    this.options().some((option) => option.provider === 'CASH'),
  );
  readonly hasToyyibPayOption = computed(() =>
    this.options().some((option) => option.provider === 'TOYYIBPAY'),
  );

  constructor() {
    this.loadOptions();
  }

  private loadOptions(): void {
    this.isLoading.set(true);
    this.merchantPaymentPlatformService
      .getMyPaymentPlatformOptions()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (options) => this.options.set(options),
        error: () => this.errorMsg.set('Failed to load your payment methods.'),
      });
  }

  // Keeps the app-wide banner/guard/button in sync after this section changes something.
  private reloadEverywhere(): void {
    this.loadOptions();
    this.merchantPaymentPlatformService.refreshPaymentPlatformOptions();
  }

  addCashOption(): void {
    this.errorMsg.set(null);
    this.isSavingCash.set(true);
    this.cashPaymentPlatformService
      .createCashPaymentPlatformOption({})
      .pipe(
        finalize(() => this.isSavingCash.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadEverywhere(),
        error: (error: HttpErrorResponse) => this.errorMsg.set(getErrorMessage(error)),
      });
  }

  showToyyibPayForm(): void {
    this.errorMsg.set(null);
    this.isShowingToyyibPayForm.set(true);
  }

  cancelToyyibPayForm(): void {
    this.toyyibPayForm.reset({
      categoryCode: '',
      secretKey: '',
      chargeFpxToCustomer: false,
      chargeToPrepaid: false,
    });
    this.isShowingToyyibPayForm.set(false);
  }

  submitToyyibPayForm(): void {
    this.toyyibPayForm.markAllAsTouched();
    if (this.toyyibPayForm.invalid) {
      return;
    }

    this.errorMsg.set(null);
    this.isSavingToyyibPay.set(true);
    this.toyyibPayPaymentConfigService
      .createToyyibPayPaymentConfigOption(this.toyyibPayForm.getRawValue())
      .pipe(
        finalize(() => this.isSavingToyyibPay.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelToyyibPayForm();
          this.reloadEverywhere();
        },
        error: (error: HttpErrorResponse) => this.errorMsg.set(getErrorMessage(error)),
      });
  }

  setAsDefault(option: MerchantPaymentPlatformOption): void {
    this.errorMsg.set(null);
    this.updatePaymentPlatformOptionAsDefault(option)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.reloadEverywhere(),
        error: (error: HttpErrorResponse) => this.errorMsg.set(getErrorMessage(error)),
      });
  }

  private updatePaymentPlatformOptionAsDefault(
    option: MerchantPaymentPlatformOption,
  ): Observable<MerchantPaymentPlatformOption> {
    if (option.provider === 'CASH') {
      return this.cashPaymentPlatformService.updateCashPaymentPlatformOption(option.id, {
        isDefaultPaymentPlatform: true,
      });
    }
    return this.toyyibPayPaymentConfigService.updateToyyibPayPaymentConfigOption(option.id, {
      isDefaultPaymentPlatform: true,
    });
  }
}
