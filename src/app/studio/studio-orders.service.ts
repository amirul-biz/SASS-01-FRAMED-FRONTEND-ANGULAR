import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { CountryCode } from '../checkout/country-code.constants';
import {
  OrderCommission,
  OrderPayment,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../checkout/order.service';
import { PaginatedResponse } from './studio-events.service';

export type { OrderStatus };

export type TransitionSource = 'WEBHOOK' | 'MANUAL' | 'SYSTEM' | 'CUSTOMER';

export interface OrderHistoryEntry {
  id: string;
  createdAt: string;
  source: TransitionSource;
  provider: PaymentProvider;
  fromPaymentStatus: PaymentStatus | null;
  toPaymentStatus: PaymentStatus;
  fromOrderStatus: OrderStatus | null;
  toOrderStatus: OrderStatus;
  note: string | null;
  recordedBy: string | null;
}

export interface OrderHistory {
  orderId: string;
  orderCreatedAt: string;
  entries: OrderHistoryEntry[];
  commission: OrderCommission | null;
  billCode: string | null;
}

export interface MarkedAsPaidPayment {
  id: string;
  orderId: string;
  status: OrderPayment['status'];
  orderStatus: OrderStatus;
}

export interface SyncedToyyibPayPayment {
  synced: boolean;
}

export interface StudioOrderItem {
  id: string;
  photoId: string;
  photoName: string;
  photoUrl: string;
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
  payment: OrderPayment | null;
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

export type OrderPaymentTracking = 'TRACKED' | 'LEGACY';

export interface ListOrdersQuery {
  pageNumber: number;
  pageSize: number;
  eventId?: string;
  status?: OrderStatus;
  paymentTracking?: OrderPaymentTracking;
}

@Injectable({ providedIn: 'root' })
export class StudioOrdersService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  listOrders(query: ListOrdersQuery): Observable<PaginatedOrders> {
    const params: Record<string, string | number> = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    };
    if (query.eventId) {
      params['eventId'] = query.eventId;
    }
    if (query.status) {
      params['status'] = query.status;
    }
    if (query.paymentTracking) {
      params['paymentTracking'] = query.paymentTracking;
    }

    return this.http.get<PaginatedOrders>(`${this.env.apiUrl}/orders`, { params });
  }

  getOrderHistory(orderId: string): Observable<OrderHistory> {
    return this.http.get<OrderHistory>(`${this.env.apiUrl}/orders/${orderId}/history`);
  }

  markCashPaymentAsPaid(paymentId: string, notes?: string): Observable<MarkedAsPaidPayment> {
    return this.http.patch<MarkedAsPaidPayment>(
      `${this.env.apiUrl}/cash-order-payments/${paymentId}/mark-as-paid`,
      { notes },
    );
  }

  resyncToyyibPayPayment(paymentId: string): Observable<SyncedToyyibPayPayment> {
    return this.http.post<SyncedToyyibPayPayment>(
      `${this.env.apiUrl}/toyyibpay-order-payment/post-payment/${paymentId}/resync`,
      {},
    );
  }
}
