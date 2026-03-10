import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../models/app-config.model';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly _config = signal<AppConfig | null>(null);

  readonly config = this._config.asReadonly();

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<AppConfig>('assets/config/config.json'));
    if (!config?.apiBaseUrl || typeof config.apiBaseUrl !== 'string') {
      throw new Error('Invalid frontend config: apiBaseUrl is required');
    }
    this._config.set(config);
  }

  get apiBaseUrl(): string {
    const cfg = this._config();
    if (!cfg) throw new Error('App config is not loaded yet');
    return cfg.apiBaseUrl;
  }
}
