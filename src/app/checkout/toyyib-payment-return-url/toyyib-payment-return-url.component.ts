import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfirmToyyibPayReturnResult, OrderService, PaymentStatus } from '../order.service';

// Landing page for ToyyibPay's billReturnUrl redirect (see TOYYIBPAY_RETURN_URL) — this is the
// customer's browser after paying, not the server-to-server webhook. ToyyibPay's own query param
// is named order_id, but it's actually our internal MerchantPayment.id (confirmed against the
// backend's bill-creation code) — renamed to paymentId here so that mistake doesn't spread.
export type ReturnPageStatus = 'verifying' | 'paid' | 'failed' | 'pending' | 'error';

const PAYMENT_STATUS_TO_PAGE_STATUS: Record<PaymentStatus, ReturnPageStatus> = {
  PAID: 'paid',
  FAILED: 'failed',
  PENDING: 'pending',
  PROCESSING: 'pending',
};

@Component({
  selector: 'app-toyyib-payment-return-url',
  imports: [RouterLink],
  templateUrl: './toyyib-payment-return-url.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToyyibPaymentReturnUrlComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  private paymentId: string | null = null;
  private billCode: string | null = null;

  // The backend is the source of truth for what actually happened — the page shows nothing
  // conclusive until it responds, so a genuinely failed payment never gets shown a thank-you.
  readonly pageStatus = signal<ReturnPageStatus>('verifying');
  readonly retrying = signal(false);

  ngOnInit(): void {
    const queryParamMap = this.route.snapshot.queryParamMap;
    this.paymentId = queryParamMap.get('order_id');
    this.billCode = queryParamMap.get('billcode');

    const canConfirm = this.paymentId !== null && this.billCode !== null;
    if (!canConfirm) {
      this.pageStatus.set('error');
      return;
    }

    this.orderService
      .confirmToyyibPayReturn(this.paymentId!, this.billCode!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => this.pageStatus.set('error'),
      });
  }

  retryConfirmation(): void {
    const canRetry = this.paymentId !== null && this.billCode !== null && !this.retrying();
    if (!canRetry) {
      return;
    }

    this.retrying.set(true);
    this.orderService
      .confirmToyyibPayReturn(this.paymentId!, this.billCode!)
      .pipe(finalize(() => this.retrying.set(false)))
      .subscribe({
        next: (result) => this.applyResult(result),
        error: () => this.pageStatus.set('error'),
      });
  }

  private applyResult(result: ConfirmToyyibPayReturnResult): void {
    this.pageStatus.set(PAYMENT_STATUS_TO_PAGE_STATUS[result.paymentStatus]);
  }
}
