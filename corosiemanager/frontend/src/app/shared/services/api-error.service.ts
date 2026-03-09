import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  toUserMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const detail = this.extractDetail(error.error);
    if (detail) {
      return `${fallback}: ${detail}`;
    }

    if (error.status === 0) {
      return `${fallback}: server niet bereikbaar.`;
    }
    if (error.status === 401) {
      return `${fallback}: niet geautoriseerd.`;
    }
    if (error.status === 403) {
      return `${fallback}: onvoldoende rechten.`;
    }
    if (error.status === 404) {
      return `${fallback}: endpoint niet gevonden.`;
    }

    return `${fallback} (HTTP ${error.status}).`;
  }

  private extractDetail(payload: any): string | null {
    if (!payload) return null;

    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim();
    }

    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const messages = payload.detail
        .map((item: any) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter((msg: string | null): msg is string => !!msg);
      if (messages.length > 0) {
        return messages.join('; ');
      }
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    return null;
  }
}
