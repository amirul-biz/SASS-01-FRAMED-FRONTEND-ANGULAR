import { HttpBackend, HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PresignedUploadService {
  // Bypasses interceptors (e.g. the Firebase auth interceptor) since this
  // client is only ever used for direct PUTs to presigned R2 URLs.
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  uploadToPresignedUrl(uploadUrl: string, file: File): Observable<unknown> {
    return this.rawHttp.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
    });
  }

  /** Same PUT, but emits HttpEvents (including UploadProgress) for per-file progress bars. */
  uploadWithProgress(uploadUrl: string, file: File): Observable<HttpEvent<unknown>> {
    const request = new HttpRequest('PUT', uploadUrl, file, {
      headers: new HttpHeaders({ 'Content-Type': file.type }),
      reportProgress: true,
    });
    return this.rawHttp.request(request);
  }
}
