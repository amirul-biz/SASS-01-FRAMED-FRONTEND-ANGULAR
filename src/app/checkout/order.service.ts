import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { CountryCode } from './country-code.constants';

export type OrderStatus = 'PENDING_CONFIRMATION' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PaymentProvider = 'CASH' | 'TOYYIBPAY' | 'STRIPE';

export type CommissionType =
  | 'PERCENTAGE_PER_TRANSACTION'
  | 'AMOUNT_PER_TRANSACTION'
  | 'PERCENTAGE_PER_UNIT'
  | 'AMOUNT_PER_UNIT';

export interface OrderCommission {
  commissionType: CommissionType;
  originalPaymentAmount: number;
  commissionBaseAmount: number;
  percentageRateApplied: number | null;
  flatAmountApplied: number | null;
  commissionPerUnitApplied: number | null;
  unitCount: number | null;
  totalUnitCost: number | null;
  averageCostPerUnit: number | null;
  averageCommissionPerUnit: number | null;
  commissionAmount: number;
  commissionImposedAt: string;
}

export interface OrderPayment {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  commission: OrderCommission | null;
  // Only set right after checkout, for a provider that redirects the customer to pay
  // (ToyyibPay); null for cash.
  paymentUrl: string | null;
}

export interface CreateOrderItem {
  photoId: string;
  pricingOptionId: string;
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
  // Generated once per checkout attempt and reused on retry, so a retried submission (e.g. after
  // a network timeout) returns the original order instead of creating a duplicate.
  idempotencyKey: string;
}

export interface PriceBreakdown {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface OrderResponseItem {
  id: string;
  photoId: string;
  photoName: string;
  photoUrl: string;
  formatLabel: string;
  price: number;
}

export interface OrderResponse
  extends Omit<CreateOrderPayload, 'voucherId' | 'idempotencyKey' | 'items'> {
  id: string;
  priceBreakdown: PriceBreakdown;
  voucherId: string | null;
  status: OrderStatus;
  payment: OrderPayment | null;
  items: OrderResponseItem[];
  createdAt: string;
}

export interface ConfirmToyyibPayReturnResult {
  paymentStatus: PaymentStatus;
  orderId: string;
  // For the return-URL page's WhatsApp fallback — both null when the photographer has no contact
  // number on file either way.
  photographerContactNo: string | null;
  photographerPhone: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  createOrder(payload: CreateOrderPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.env.apiUrl}/orders`, payload);
  }

  // Called from the ToyyibPay return-URL landing page as a safety net, in case the server-to-server
  // webhook never arrives — billCode is what ToyyibPay's own redirect carries, and the backend uses
  // it as this anonymous customer's proof they're the real payer for this paymentId. resendEmail
  // should only ever be true on the page's explicit "didn't receive it?" retry — the automatic
  // landing-page check never sets it, so a duplicate email only happens when the customer asks.
  confirmToyyibPayReturn(
    paymentId: string,
    billCode: string,
    resendEmail = false,
  ): Observable<ConfirmToyyibPayReturnResult> {
    return this.http.post<ConfirmToyyibPayReturnResult>(
      `${this.env.apiUrl}/toyyibpay-order-payment/post-payment/${paymentId}/confirm-return`,
      { billCode, resendEmail },
    );
  }

  // Called from the receipt and image-gallery pages linked in the delivery email — public,
  // unauthenticated. The backend 400s if the order was never paid.
  getOrderReceipt(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.env.apiUrl}/orders/${orderId}/receipt`);
  }
}
