import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Claim,
  ClaimStats,
  CreateClaim,
  CreateDamage,
  Paginated,
  UpdateClaim,
} from './claim.model';

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/claims`;

  list(page = 1, limit = 10): Observable<Paginated<Claim>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<Paginated<Claim>>(this.baseUrl, { params });
  }

  getStats(): Observable<ClaimStats> {
    return this.http.get<ClaimStats>(`${this.baseUrl}/stats`);
  }

  getById(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.baseUrl}/${id}`);
  }

  create(data: CreateClaim): Observable<Claim> {
    return this.http.post<Claim>(this.baseUrl, data);
  }

  update(id: string, data: UpdateClaim): Observable<Claim> {
    return this.http.patch<Claim>(`${this.baseUrl}/${id}`, data);
  }

  addDamage(claimId: string, data: CreateDamage): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/${claimId}/damages`, data);
  }

  replaceDamage(
    claimId: string,
    damageId: string,
    data: CreateDamage,
  ): Observable<Claim> {
    return this.http.put<Claim>(
      `${this.baseUrl}/${claimId}/damages/${damageId}`,
      data,
    );
  }

  removeDamage(claimId: string, damageId: string): Observable<Claim> {
    return this.http.delete<Claim>(
      `${this.baseUrl}/${claimId}/damages/${damageId}`,
    );
  }
}
