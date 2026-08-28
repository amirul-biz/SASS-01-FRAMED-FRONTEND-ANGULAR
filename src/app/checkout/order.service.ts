import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { CountryCode } from './country-code.constants';

export interface CreateOrderItem {
  photoId: string;
  formatLabel: string;
  price: number;
}

export interface CreateOrderPayload {
  eventId: string;
  email: string;
  countryCode: CountryCode;
  phone: string;
  items: CreateOrderItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  voucherId?: string;
  voucherName?: string;
}

export interface PriceBreakdown {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface OrderResponse extends Omit<CreateOrderPayload, 'voucherId'> {
  id: string;
  priceBreakdown: PriceBreakdown;
  voucherId: string | null;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  createOrder(payload: CreateOrderPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.env.apiUrl}/orders`, payload);
  }
}
