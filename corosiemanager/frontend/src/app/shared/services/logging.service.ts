import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoggingService {
  info(message: string, context?: unknown): void {
    console.info('[INFO]', message, context ?? '');
  }

  error(message: string, error?: unknown): void {
    console.error('[ERROR]', message, error ?? '');
  }
}
