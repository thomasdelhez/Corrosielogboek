import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfigService } from './core/services/app-config.service';
import { authInterceptor } from './core/security/interceptors/auth.interceptor';
import { GlobalErrorHandlingService } from './core/services/error-handling.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
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
