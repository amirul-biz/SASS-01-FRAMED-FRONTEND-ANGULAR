import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';
import { PresignedUploadService } from '../core/presigned-upload.service';

export interface PhotographerProfile {
  id: string;
  userPlatformId: string;
  name: string;
  bio: string | null;
  companyName: string | null;
  phone: string | null;
  contactNo: string | null;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePhotographerProfileDto {
  name?: string;
  bio?: string;
  companyName?: string;
  phone?: string;
  contactNo?: string;
  profileImageUrl?: string;
  bannerUrl?: string;
}

export interface PresignProfileImageUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class StudioProfileService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly presignedUpload = inject(PresignedUploadService);

  private readonly _isProfileComplete = signal(true);
  readonly isProfileComplete = this._isProfileComplete.asReadonly();

  getMyProfile(): Observable<PhotographerProfile> {
    return this.http.get<PhotographerProfile>(
      `${this.env.apiUrl}/photographer/profile`,
    );
  }

  getProfileCompleteness(): Observable<{ isComplete: boolean }> {
    return this.http.get<{ isComplete: boolean }>(
      `${this.env.apiUrl}/photographer/profile/completeness`,
    );
  }

  refreshProfileCompleteness(): void {
    this.getProfileCompleteness().subscribe({
      next: (res) => this._isProfileComplete.set(res.isComplete),
      error: () => undefined,
    });
  }

  updateMyProfile(
    dto: UpdatePhotographerProfileDto,
  ): Observable<PhotographerProfile> {
    return this.http.patch<PhotographerProfile>(
      `${this.env.apiUrl}/photographer/profile`,
      dto,
    );
  }

  presignProfileImage(
    fileName: string,
    mimeType: string,
  ): Observable<PresignProfileImageUploadResponse> {
    return this.http.post<PresignProfileImageUploadResponse>(
      `${this.env.apiUrl}/photographer/profile/image/presign`,
      { fileName, mimeType },
    );
  }

  presignProfileBanner(
    fileName: string,
    mimeType: string,
  ): Observable<PresignProfileImageUploadResponse> {
    return this.http.post<PresignProfileImageUploadResponse>(
      `${this.env.apiUrl}/photographer/profile/banner/presign`,
      { fileName, mimeType },
    );
  }

  uploadToPresignedUrl(uploadUrl: string, file: File): Observable<unknown> {
    return this.presignedUpload.uploadToPresignedUrl(uploadUrl, file);
  }
}
