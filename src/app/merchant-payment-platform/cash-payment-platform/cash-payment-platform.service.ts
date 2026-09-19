import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../../core/environment.token';
import { MerchantPaymentPlatformOption } from '../merchant-payment-platform.service';

export type CashPaymentPlatformOption = MerchantPaymentPlatformOption;

export interface CreateCashPaymentPlatformOptionDto {
  isDefaultPaymentPlatform?: boolean;
}

export interface UpdateCashPaymentPlatformOptionDto {
  isDefaultPaymentPlatform?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CashPaymentPlatformService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  createCashPaymentPlatformOption(
    dto: CreateCashPaymentPlatformOptionDto,
  ): Observable<CashPaymentPlatformOption> {
    return this.http.post<CashPaymentPlatformOption>(
      `${this.env.apiUrl}/cash-payment-platform`,
      dto,
    );
  }

  updateCashPaymentPlatformOption(
    id: string,
    dto: UpdateCashPaymentPlatformOptionDto,
  ): Observable<CashPaymentPlatformOption> {
    return this.http.patch<CashPaymentPlatformOption>(
      `${this.env.apiUrl}/cash-payment-platform/${id}`,
      dto,
    );
  }
}
