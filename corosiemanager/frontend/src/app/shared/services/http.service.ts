import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HttpService {
  constructor(private readonly http: HttpClient) {}

  get<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    return this.http.get<T>(url, { params: this.buildParams(params), headers: this.defaultHeaders() });
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body, { headers: this.defaultHeaders() });
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(url, body, { headers: this.defaultHeaders() });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url, { headers: this.defaultHeaders() });
  }

  private defaultHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private buildParams(input?: Record<string, string | number | boolean | undefined>): HttpParams {
    let params = new HttpParams();
    if (!input) return params;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
