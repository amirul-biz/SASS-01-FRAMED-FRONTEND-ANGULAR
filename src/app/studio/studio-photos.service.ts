import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { PresignedUploadService } from '../core/presigned-upload.service';
import { PaginatedResponse } from './studio-events.service';

export type PhotoUploadStatus = 'PENDING' | 'UPLOADED' | 'FAILED';

export interface Photo {
  id: string;
  eventId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  status: PhotoUploadStatus;
  url: string | null;
  uploadedAt: string | null;
  capturedAt: string | null;
  isEventAlbumCover: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresignPhotoFile {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface PresignedPhoto {
  photoId: string;
  uploadUrl: string;
  key: string;
}

export interface PresignPhotosBatchResponse {
  photos: PresignedPhoto[];
  expiresIn: number;
}

export interface ReuploadPhotoResponse {
  status: PhotoUploadStatus;
  key: string;
  uploadUrl?: string;
  expiresIn?: number;
}

@Injectable({ providedIn: 'root' })
export class StudioPhotosService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly presignedUpload = inject(PresignedUploadService);

  presignBatch(
    eventId: string,
    files: PresignPhotoFile[],
  ): Observable<PresignPhotosBatchResponse> {
    return this.http.post<PresignPhotosBatchResponse>(
      `${this.env.apiUrl}/events/${eventId}/photos/presign-batch`,
      { files },
    );
  }

  confirmUpload(
    eventId: string,
    photoId: string,
    metadata: { width?: number; height?: number; capturedAt?: string },
  ): Observable<Photo> {
    return this.http.post<Photo>(
      `${this.env.apiUrl}/events/${eventId}/photos/${photoId}/confirm`,
      metadata,
    );
  }

  reupload(
    eventId: string,
    photoId: string,
    fileName: string,
    mimeType: string,
  ): Observable<ReuploadPhotoResponse> {
    return this.http.post<ReuploadPhotoResponse>(
      `${this.env.apiUrl}/events/${eventId}/photos/${photoId}/reupload`,
      { fileName, mimeType },
    );
  }

  listPhotos(
    eventId: string,
    status?: PhotoUploadStatus,
    pageNumber = 1,
    pageSize = 30,
  ): Observable<PaginatedResponse<Photo>> {
    return this.http.get<PaginatedResponse<Photo>>(
      `${this.env.apiUrl}/events/${eventId}/photos`,
      { params: { pageNumber, pageSize, ...(status && { status }) } },
    );
  }

  setAlbumCover(eventId: string, photoId: string, isEventAlbumCover: boolean): Observable<Photo> {
    return this.http.patch<Photo>(
      `${this.env.apiUrl}/events/${eventId}/photos/${photoId}/album-cover`,
      { isEventAlbumCover },
    );
  }

  deletePhoto(eventId: string, photoId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.env.apiUrl}/events/${eventId}/photos/${photoId}`,
    );
  }

  uploadWithProgress(uploadUrl: string, file: File): Observable<HttpEvent<unknown>> {
    return this.presignedUpload.uploadWithProgress(uploadUrl, file);
  }
}
