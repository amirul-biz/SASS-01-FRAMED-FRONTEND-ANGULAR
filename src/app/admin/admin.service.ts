import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export interface AdminPhotographer {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  contactNo: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  eventCount: number;
  createdAt: string;
}

export interface AdminPaginated<T> {
  items: T[];
  totalItemCount: number;
}

export interface AdminEvent {
  id: string;
  title: string;
  category: string;
  location: string | null;
  photographerId: string;
  photographerName: string;
  isPublished: boolean;
  photoCount: number;
  orderCount: number;
  eventStartDate: string;
  eventEndDate: string;
}

export interface AdminOrderItem {
  id: string;
  photoName: string;
  formatLabel: string;
  price: number;
}

export type AdminOrderStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';

export interface AdminOrder {
  id: string;
  eventId: string;
  eventTitle: string;
  email: string;
  voucherName: string | null;
  status: AdminOrderStatus;
  total: number;
  items: AdminOrderItem[];
  createdAt: string;
}

export interface AdminDailyStat {
  date: string;
  photosUploaded: number;
  eventsCreated: number;
  photographersRegistered: number;
  orders: number;
}

export interface AdminStats {
  totalPhotosUploaded: number;
  totalEventsPublished: number;
  totalEvents: number;
  totalPhotographers: number;
  totalOrders: number;
  totalRevenue: number;
  activePhotographers: number;
  inactivePhotographers: number;
  daily: AdminDailyStat[];
}

export interface AdminRegisterPhotographerPayload {
  email: string;
  password: string;
  name: string;
  companyName?: string;
  phone?: string;
  bio?: string;
}

export interface AdminListParams {
  search?: string;
  photographerId?: string;
  eventId?: string;
  status?: AdminOrderStatus;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.env.apiUrl}/admin/stats`);
  }

  getPhotographers(params: { search?: string } = {}): Observable<AdminPaginated<AdminPhotographer>> {
    return this.http.get<AdminPaginated<AdminPhotographer>>(`${this.env.apiUrl}/admin/photographers`, {
      params: { ...(params.search && { search: params.search }) },
    });
  }

  registerPhotographer(payload: AdminRegisterPhotographerPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.env.apiUrl}/admin/photographers`, payload);
  }

  setPhotographerStatus(id: string, isActive: boolean): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.env.apiUrl}/admin/photographers/${id}/status`,
      { isActive },
    );
  }

  getEvents(
    params: { search?: string; photographerId?: string; pageNumber?: number; pageSize?: number } = {},
  ): Observable<AdminPaginated<AdminEvent>> {
    return this.http.get<AdminPaginated<AdminEvent>>(`${this.env.apiUrl}/admin/events`, {
      params: {
        ...(params.search && { search: params.search }),
        ...(params.photographerId && { photographerId: params.photographerId }),
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 50,
      },
    });
  }

  getOrders(
    params: { eventId?: string; status?: AdminOrderStatus; pageNumber?: number; pageSize?: number } = {},
  ): Observable<AdminPaginated<AdminOrder>> {
    return this.http.get<AdminPaginated<AdminOrder>>(`${this.env.apiUrl}/admin/orders`, {
      params: {
        ...(params.eventId && { eventId: params.eventId }),
        ...(params.status && { status: params.status }),
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 50,
      },
    });
  }
}