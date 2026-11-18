import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { PresignedUploadService } from '../core/presigned-upload.service';

export type CommissionStatus = 'ACCRUING' | 'DUE' | 'OVERDUE' | 'PAID';

export interface CommissionAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  uploadedByRole: 'PHOTOGRAPHER' | 'ADMIN';
  createdAt: string;
}

export interface CommissionStatement {
  /** YYYY-MM, Malaysia time. */
  period: string;
  amount: number;
  status: CommissionStatus;
  paidAt: string | null;
  notes: string | null;
  attachments: CommissionAttachment[];
}

export interface AdminCommissionStatement extends CommissionStatement {
  photographerId: string;
  photographerName: string;
  photographerEmail: string;
}

export interface CurrentCommission {
  period: string;
  amount: number;
}

interface PresignResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export const COMMISSION_FILE_ACCEPT = 'image/jpeg,image/png,application/pdf';

/** Photographer and admin sides of the monthly commission statements API. */
@Injectable({ providedIn: 'root' })
export class CommissionStatementService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly presignedUpload = inject(PresignedUploadService);

  private readonly mineUrl = `${this.env.apiUrl}/commission-statements`;
  private readonly adminUrl = `${this.env.apiUrl}/admin/commission-statements`;

  // ---- photographer ----

  getCurrent(): Observable<CurrentCommission> {
    return this.http.get<CurrentCommission>(`${this.mineUrl}/current`);
  }

  list(): Observable<CommissionStatement[]> {
    return this.http.get<CommissionStatement[]>(this.mineUrl);
  }

  uploadMine(period: string, file: File): Observable<void> {
    return this.upload(`${this.mineUrl}/${period}/attachments`, file);
  }

  // ---- admin ----

  adminList(period: string, status?: CommissionStatus): Observable<AdminCommissionStatement[]> {
    return this.http.get<AdminCommissionStatement[]>(this.adminUrl, {
      params: { period, ...(status && { status }) },
    });
  }

  adminSetStatus(
    photographerId: string,
    period: string,
    status: 'PAID' | 'UNPAID',
    notes?: string,
  ): Observable<void> {
    return this.http
      .patch(`${this.adminUrl}/${photographerId}/${period}`, { status, ...(notes && { notes }) })
      .pipe(map(() => undefined));
  }

  adminUpload(photographerId: string, period: string, file: File): Observable<void> {
    return this.upload(`${this.adminUrl}/${photographerId}/${period}/attachments`, file);
  }

  // presign -> PUT straight to storage -> confirm so the server records it.
  private upload(attachmentsUrl: string, file: File): Observable<void> {
    const meta = { fileName: file.name, mimeType: file.type };
    return this.http.post<PresignResponse>(`${attachmentsUrl}/presign`, meta).pipe(
      switchMap((presigned) =>
        this.presignedUpload
          .uploadToPresignedUrl(presigned.uploadUrl, file)
          .pipe(map(() => presigned.key)),
      ),
      switchMap((key) => this.http.post(attachmentsUrl, { ...meta, key })),
      map(() => undefined),
    );
  }
}
