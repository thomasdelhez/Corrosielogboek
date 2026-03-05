import { ErrorHandler, Injectable } from '@angular/core';
import { LoggingService } from '../../shared/services/logging.service';

@Injectable()
export class GlobalErrorHandlingService implements ErrorHandler {
  constructor(private readonly logging: LoggingService) {}

  handleError(error: unknown): void {
    this.logging.error('Unhandled application error', error);
  }
}
