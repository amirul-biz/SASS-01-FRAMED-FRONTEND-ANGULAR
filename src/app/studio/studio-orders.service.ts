import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { CountryCode } from '../checkout/country-code.constants';
import { PaginatedResponse } from './studio-events.service';

export type OrderStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';

export interface StudioOrderItem {
  id: string;
  photoId: string;
  formatLabel: string;
  price: number;
}

export interface StudioOrderPriceBreakdown {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface StudioOrder {
  id: string;
  eventId: string;
  eventTitle: string;
  email: string;
  countryCode: CountryCode;
  phone: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  priceBreakdown: StudioOrderPriceBreakdown;
  voucherId: string | null;
  voucherName: string | null;
  status: OrderStatus;
  createdAt: string;
  items: StudioOrderItem[];
}

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
}

export interface PaginatedOrders extends PaginatedResponse<StudioOrder> {
  summary: OrderSummary;
}

@Injectable({ providedIn: 'root' })
export class StudioOrdersService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  listOrders(
    pageNumber: number,
    pageSize: number,
    eventId?: string,
    status?: OrderStatus,
  ): Observable<PaginatedOrders> {
    const params: Record<string, string | number> = { pageNumber, pageSize };
    if (eventId) {
      params['eventId'] = eventId;
    }
    if (status) {
      params['status'] = status;
    }

    return this.http.get<PaginatedOrders>(`${this.env.apiUrl}/orders`, { params });
  }
}
