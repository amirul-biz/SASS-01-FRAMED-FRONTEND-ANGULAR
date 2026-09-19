import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../../core/environment.token';
import { MerchantPaymentPlatformOption } from '../merchant-payment-platform.service';

export interface ToyyibPayPaymentPlatformOption extends MerchantPaymentPlatformOption {
  categoryCode: string;
  chargeFpxToCustomer: boolean;
  chargeToPrepaid: boolean;
}

export interface CreateToyyibPayPaymentPlatformOptionDto {
  categoryCode: string;
  secretKey: string;
  chargeFpxToCustomer?: boolean;
  chargeToPrepaid?: boolean;
  isDefaultPaymentPlatform?: boolean;
}

export interface UpdateToyyibPayPaymentPlatformOptionDto {
  categoryCode?: string;
  secretKey?: string;
  chargeFpxToCustomer?: boolean;
  chargeToPrepaid?: boolean;
  isDefaultPaymentPlatform?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToyyibPayPaymentPlatformService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  createToyyibPayPaymentPlatformOption(
    dto: CreateToyyibPayPaymentPlatformOptionDto,
  ): Observable<ToyyibPayPaymentPlatformOption> {
    return this.http.post<ToyyibPayPaymentPlatformOption>(
      `${this.env.apiUrl}/toyyibpay-payment-platform`,
      dto,
    );
  }

  updateToyyibPayPaymentPlatformOption(
    id: string,
    dto: UpdateToyyibPayPaymentPlatformOptionDto,
  ): Observable<ToyyibPayPaymentPlatformOption> {
    return this.http.patch<ToyyibPayPaymentPlatformOption>(
      `${this.env.apiUrl}/toyyibpay-payment-platform/${id}`,
      dto,
    );
  }
}
