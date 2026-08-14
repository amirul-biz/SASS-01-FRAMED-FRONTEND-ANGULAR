import { HttpClient } from '@angular/common/http';
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
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePhotographerProfileDto {
  name?: string;
  bio?: string;
  companyName?: string;
  phone?: string;
  contactNo?: string;
}

@Injectable({ providedIn: 'root' })
export class StudioProfileService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

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
}
