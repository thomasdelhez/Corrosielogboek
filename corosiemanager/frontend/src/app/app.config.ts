import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfigService } from './core/services/app-config.service';
import { GlobalErrorHandlingService } from './core/services/error-handling.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlingService,
    },
    provideAppInitializer(() => {
      const appConfigService = inject(AppConfigService);
      return appConfigService.load();
    }),
  ],
};
