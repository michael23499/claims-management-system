import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/uploads`;

  // Uploads an image file and returns its server path (e.g. /uploads/<id>.png).
  upload(file: File): Observable<{ path: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ path: string }>(this.baseUrl, form);
  }
}
