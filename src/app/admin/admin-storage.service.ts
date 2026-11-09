import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { AdminPaginated } from './admin.service';

export interface AdminStorageLimit {
  id: string;
  name: string;
  limitMb: number;
  assignmentCount: number;
  createdAt: string;
}

export interface AdminStorageAssignment {
  photographerId: string;
  name: string;
  email: string;
  usedBytes: number;
  storageLimitId: string | null;
  storageLimitName: string | null;
  limitMb: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminStorageService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly baseUrl = `${this.env.apiUrl}/admin/storage-limits`;

  getLimits(): Observable<AdminStorageLimit[]> {
    return this.http.get<AdminStorageLimit[]>(this.baseUrl);
  }

  createLimit(payload: { name: string; limitMb: number }): Observable<AdminStorageLimit> {
    return this.http.post<AdminStorageLimit>(this.baseUrl, payload);
  }

  updateLimit(
    id: string,
    payload: { name?: string; limitMb?: number },
  ): Observable<AdminStorageLimit> {
    return this.http.patch<AdminStorageLimit>(`${this.baseUrl}/${id}`, payload);
  }

  deleteLimit(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  getAssignments(
    params: { pageNumber?: number; pageSize?: number } = {},
  ): Observable<AdminPaginated<AdminStorageAssignment>> {
    return this.http.get<AdminPaginated<AdminStorageAssignment>>(`${this.baseUrl}/assignments`, {
      params: {
        ...(params.pageNumber && { pageNumber: params.pageNumber }),
        ...(params.pageSize && { pageSize: params.pageSize }),
      },
    });
  }

  assignLimit(
    photographerId: string,
    storageLimitId: string | null,
  ): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/assignments/${photographerId}`, {
      storageLimitId,
    });
  }
}
