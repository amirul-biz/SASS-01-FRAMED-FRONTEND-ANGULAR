import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { AdminPaginated } from './admin.service';

export type PaymentProvider = 'TOYYIBPAY' | 'STRIPE' | 'CASH';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CommissionType =
  | 'PERCENTAGE_PER_TRANSACTION'
  | 'AMOUNT_PER_TRANSACTION'
  | 'PERCENTAGE_PER_UNIT'
  | 'AMOUNT_PER_UNIT';

export interface CommissionReportCharge {
  paymentId: string;
  orderId: string;
  eventTitle: string;
  paidAt: string;
  paidAmount: number;
  planName: string | null;
  commissionType: CommissionType | null;
  baseAmount: number;
  commissionAmount: number;
  recomputedAmount: number;
  delta: number;
  isReconciled: boolean;
}

export interface CommissionReportRow {
  photographerId: string;
  name: string;
  orderCount: number;
  grossPaid: number;
  commission: number;
  delta: number;
  isReconciled: boolean;
  charges: CommissionReportCharge[];
}

export interface CommissionReport {
  rows: CommissionReportRow[];
  totalGrossPaid: number;
  totalCommission: number;
  periodCheck: {
    grossFromRows: number;
    grossFromDb: number;
    commissionFromRows: number;
    commissionFromDb: number;
    delta: number;
    isReconciled: boolean;
  };
  duplicatePaidOrderIds: string[];
}

export interface AdminPaymentOptionReview {
  id: string;
  provider: PaymentProvider;
  approvalStatus: ApprovalStatus;
  photographerName: string | null;
  photographerEmail: string;
  categoryCode: string | null;
  verifiedAt: string | null;
  createdAt: string;
  approvalStatusUpdatedAt: string | null;
  reviewedByName: string | null;
}

export interface AdminSystemPaymentAccount {
  id: string;
  provider: PaymentProvider;
  isDefault: boolean;
  accountId: string;
  username: string | null;
  categoryCode: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface AdminCommissionPlan {
  id: string;
  name: string;
  type: CommissionType;
  provider: PaymentProvider | null;
  isDefault: boolean;
  isActive: boolean;
  value: number;
  assignmentCount: number;
  createdAt: string;
}

export interface AdminCommissionAssignment {
  paymentPlatformOptionId: string;
  provider: PaymentProvider;
  approvalStatus: ApprovalStatus;
  photographerName: string | null;
  photographerEmail: string;
  commissionPlanId: string | null;
  commissionPlanName: string | null;
  splitSystemAccountId: string | null;
  splitUsername: string | null;
}

export interface CreateCommissionPlanPayload {
  name: string;
  type: CommissionType;
  value: number;
  provider?: PaymentProvider;
  isDefault?: boolean;
}

export interface UpdateCommissionPlanPayload {
  name?: string;
  value?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface AssignCommissionPlanPayload {
  commissionPlanId: string;
  splitSystemAccountId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  // --- U5: photographer payment-option approval queue -------------------------

  getPaymentOptionsForReview(
    params: {
      status?: ApprovalStatus;
      provider?: PaymentProvider;
      pageNumber?: number;
      pageSize?: number;
    } = {},
  ): Observable<AdminPaginated<AdminPaymentOptionReview>> {
    return this.http.get<AdminPaginated<AdminPaymentOptionReview>>(
      `${this.env.apiUrl}/admin/merchant-payment-platform`,
      {
        params: {
          ...(params.status && { status: params.status }),
          ...(params.provider && { provider: params.provider }),
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 50,
        },
      },
    );
  }

  setPaymentOptionApproval(
    id: string,
    status: Exclude<ApprovalStatus, 'PENDING'>,
  ): Observable<AdminPaymentOptionReview> {
    return this.http.patch<AdminPaymentOptionReview>(
      `${this.env.apiUrl}/admin/merchant-payment-platform/${id}/approval`,
      { status },
    );
  }

  // --- U1: platform-owned payment system accounts -----------------------------

  getSystemAccounts(): Observable<AdminSystemPaymentAccount[]> {
    return this.http.get<AdminSystemPaymentAccount[]>(
      `${this.env.apiUrl}/admin/system-payment-platform`,
    );
  }

  createCashSystemAccount(): Observable<AdminSystemPaymentAccount> {
    return this.http.post<AdminSystemPaymentAccount>(
      `${this.env.apiUrl}/admin/system-payment-platform/cash`,
      {},
    );
  }

  createToyyibPaySystemAccount(payload: {
    username: string;
    secretKey: string;
    categoryCode: string;
    isDefault?: boolean;
  }): Observable<AdminSystemPaymentAccount> {
    return this.http.post<AdminSystemPaymentAccount>(
      `${this.env.apiUrl}/admin/system-payment-platform/toyyibpay`,
      payload,
    );
  }

  updateToyyibPaySystemAccount(
    id: string,
    payload: { username?: string; secretKey?: string; categoryCode?: string; isDefault?: boolean },
  ): Observable<AdminSystemPaymentAccount> {
    return this.http.patch<AdminSystemPaymentAccount>(
      `${this.env.apiUrl}/admin/system-payment-platform/toyyibpay/${id}`,
      payload,
    );
  }

  deleteSystemAccount(accountId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.env.apiUrl}/admin/system-payment-platform/${accountId}`,
    );
  }

  // --- U2-U4: commission plans and assignments --------------------------------

  getCommissionPlans(): Observable<AdminCommissionPlan[]> {
    return this.http.get<AdminCommissionPlan[]>(`${this.env.apiUrl}/admin/commission/plans`);
  }

  createCommissionPlan(payload: CreateCommissionPlanPayload): Observable<AdminCommissionPlan> {
    return this.http.post<AdminCommissionPlan>(
      `${this.env.apiUrl}/admin/commission/plans`,
      payload,
    );
  }

  updateCommissionPlan(
    id: string,
    payload: UpdateCommissionPlanPayload,
  ): Observable<AdminCommissionPlan> {
    return this.http.patch<AdminCommissionPlan>(
      `${this.env.apiUrl}/admin/commission/plans/${id}`,
      payload,
    );
  }

  deleteCommissionPlan(planId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.env.apiUrl}/admin/commission/plans/${planId}`,
    );
  }

  getCommissionReport(
    provider: PaymentProvider,
    from?: string,
    to?: string,
  ): Observable<CommissionReport> {
    return this.http.get<CommissionReport>(`${this.env.apiUrl}/admin/commission/report`, {
      params: { provider, ...(from && { from }), ...(to && { to }) },
    });
  }

  getCommissionAssignments(
    params: { provider?: PaymentProvider; pageNumber?: number; pageSize?: number } = {},
  ): Observable<AdminPaginated<AdminCommissionAssignment>> {
    return this.http.get<AdminPaginated<AdminCommissionAssignment>>(
      `${this.env.apiUrl}/admin/commission/assignments`,
      {
        params: {
          ...(params.provider && { provider: params.provider }),
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 50,
        },
      },
    );
  }

  assignCommissionPlan(
    paymentPlatformOptionId: string,
    payload: AssignCommissionPlanPayload,
  ): Observable<AdminCommissionAssignment> {
    return this.http.put<AdminCommissionAssignment>(
      `${this.env.apiUrl}/admin/commission/assignments/${paymentPlatformOptionId}`,
      payload,
    );
  }

  removeCommissionAssignment(paymentPlatformOptionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.env.apiUrl}/admin/commission/assignments/${paymentPlatformOptionId}`,
    );
  }
}