import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { PresignedUploadService } from '../core/presigned-upload.service';

export type EventCategory =
  | 'CYCLING'
  | 'RUNNING'
  | 'SWIMMING'
  | 'TRIATHLON'
  | 'MOTORSPORT'
  | 'OTHER';

export interface Event {
  id: string;
  photographerId: string;
  title: string;
  description: string | null;
  category: EventCategory;
  location: string | null;
  eventStartDate: string;
  eventEndDate: string;
  isPublished: boolean;
  publishedAt: string | null;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  category: EventCategory;
  location?: string;
  eventStartDate: string;
  eventEndDate: string;
  coverPhotoUrl?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  category?: EventCategory;
  location?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  coverPhotoUrl?: string;
  isPublished?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItemCount: number;
  totalPageCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface PresignEventCoverPhotoUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class StudioEventsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly presignedUpload = inject(PresignedUploadService);

  listMyEvents(
    pageNumber: number,
    pageSize: number,
  ): Observable<PaginatedResponse<Event>> {
    return this.http.get<PaginatedResponse<Event>>(
      `${this.env.apiUrl}/events`,
      { params: { pageNumber, pageSize } },
    );
  }

  getEvent(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.env.apiUrl}/events/${id}`);
  }

  createEvent(dto: CreateEventDto): Observable<Event> {
    return this.http.post<Event>(`${this.env.apiUrl}/events`, dto);
  }

  updateEvent(id: string, dto: UpdateEventDto): Observable<Event> {
    return this.http.patch<Event>(`${this.env.apiUrl}/events/${id}`, dto);
  }

  deleteEvent(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.env.apiUrl}/events/${id}`,
    );
  }

  presignCoverPhoto(
    fileName: string,
    mimeType: string,
  ): Observable<PresignEventCoverPhotoUploadResponse> {
    return this.http.post<PresignEventCoverPhotoUploadResponse>(
      `${this.env.apiUrl}/events/cover-photo/presign`,
      { fileName, mimeType },
    );
  }

  uploadToPresignedUrl(uploadUrl: string, file: File): Observable<unknown> {
    return this.presignedUpload.uploadToPresignedUrl(uploadUrl, file);
  }
}
