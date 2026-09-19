import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export type PaymentProvider = 'TOYYIBPAY' | 'STRIPE' | 'CASH';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MerchantPaymentPlatformOption {
  id: string;
  provider: PaymentProvider;
  isDefaultPaymentPlatform: boolean;
  approvalStatus: ApprovalStatus;
  isImposeCommission: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class MerchantPaymentPlatformService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  private readonly _paymentPlatformOptions = signal<MerchantPaymentPlatformOption[]>([]);
  readonly paymentPlatformOptions = this._paymentPlatformOptions.asReadonly();

  readonly hasApprovedPaymentPlatform = computed(() =>
    this._paymentPlatformOptions().some((option) => option.approvalStatus === 'APPROVED'),
  );

  getMyPaymentPlatformOptions(): Observable<MerchantPaymentPlatformOption[]> {
    return this.http.get<MerchantPaymentPlatformOption[]>(
      `${this.env.apiUrl}/merchant-payment-platform`,
    );
  }

  refreshPaymentPlatformOptions(): void {
    this.getMyPaymentPlatformOptions().subscribe({
      next: (options) => this._paymentPlatformOptions.set(options),
      error: () => undefined,
    });
  }
}
