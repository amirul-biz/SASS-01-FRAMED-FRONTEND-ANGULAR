import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export interface ClientLatestEvent {
  id: string;
  title: string;
  category: string;
  location: string | null;
  coverPhotoUrl: string | null;
  eventStartDate: string;
  eventEndDate: string;
  photoCount: number;
  photographerId: string;
  photographerName: string;
}

export interface ClientTopPhotographer {
  id: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  eventCount: number;
}

export interface ClientPhotographerProfile {
  id: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  eventCount: number;
  photoCount: number;
  topCategory: string | null;
}

export interface ClientHomeResponse {
  latestEvents: ClientLatestEvent[];
  topPhotographers: ClientTopPhotographer[];
}

export interface ClientEventListParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  photographerId?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PaginatedClientEventList {
  items: ClientLatestEvent[];
  totalItemCount: number;
  totalPageCount: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  getHome(): Observable<ClientHomeResponse> {
    return this.http.get<ClientHomeResponse>(`${this.env.apiUrl}/client/home`);
  }

  getEvents(params: ClientEventListParams): Observable<PaginatedClientEventList> {
    return this.http.get<PaginatedClientEventList>(`${this.env.apiUrl}/client/events`, {
      params: {
        ...(params.search && { search: params.search }),
        ...(params.dateFrom && { dateFrom: params.dateFrom }),
        ...(params.dateTo && { dateTo: params.dateTo }),
        ...(params.photographerId && { photographerId: params.photographerId }),
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 30,
      },
    });
  }

  getPhotographers(search?: string): Observable<ClientTopPhotographer[]> {
    return this.http.get<ClientTopPhotographer[]>(`${this.env.apiUrl}/client/photographers`, {
      params: { ...(search && { search }) },
    });
  }

  getPhotographerProfile(id: string): Observable<ClientPhotographerProfile> {
    return this.http.get<ClientPhotographerProfile>(
      `${this.env.apiUrl}/client/photographers/${id}`,
    );
  }
}
