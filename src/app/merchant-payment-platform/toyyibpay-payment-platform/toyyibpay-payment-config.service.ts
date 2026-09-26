import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../../core/environment.token';
import { MerchantPaymentPlatformOption } from '../merchant-payment-platform.service';

export interface ToyyibPayPaymentConfigOption extends MerchantPaymentPlatformOption {
  categoryCode: string;
  chargeFpxToCustomer: boolean;
  chargeToPrepaid: boolean;
}

export interface CreateToyyibPayPaymentConfigOptionDto {
  categoryCode: string;
  secretKey: string;
  chargeFpxToCustomer?: boolean;
  chargeToPrepaid?: boolean;
  isDefaultPaymentPlatform?: boolean;
}

export interface UpdateToyyibPayPaymentConfigOptionDto {
  categoryCode?: string;
  secretKey?: string;
  chargeFpxToCustomer?: boolean;
  chargeToPrepaid?: boolean;
  isDefaultPaymentPlatform?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToyyibPayPaymentConfigService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  createToyyibPayPaymentConfigOption(
    dto: CreateToyyibPayPaymentConfigOptionDto,
  ): Observable<ToyyibPayPaymentConfigOption> {
    return this.http.post<ToyyibPayPaymentConfigOption>(
      `${this.env.apiUrl}/toyyibpay-config`,
      dto,
    );
  }

  updateToyyibPayPaymentConfigOption(
    id: string,
    dto: UpdateToyyibPayPaymentConfigOptionDto,
  ): Observable<ToyyibPayPaymentConfigOption> {
    return this.http.patch<ToyyibPayPaymentConfigOption>(
      `${this.env.apiUrl}/toyyibpay-config/${id}`,
      dto,
    );
  }
}
