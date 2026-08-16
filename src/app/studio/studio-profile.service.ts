import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export interface PhotographerProfile {
  id: string;
  userPlatformId: string;
  name: string;
  bio: string | null;
  companyName: string | null;
  phone: string | null;
  contactNo: string | null;
  profileImageUrl: string | null;
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
  // Bypasses interceptors (e.g. the Firebase auth interceptor) since this
  // client is only ever used for direct PUTs to presigned R2 URLs.
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  getMyProfile(): Observable<PhotographerProfile> {
    return this.http.get<PhotographerProfile>(
      `${this.env.apiUrl}/photographer/profile`,
    );
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

  uploadToPresignedUrl(uploadUrl: string, file: File): Observable<unknown> {
    return this.rawHttp.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
    });
  }
}
