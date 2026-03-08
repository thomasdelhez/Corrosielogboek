import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationService } from './core/security/services/authentication.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  private readonly auth = inject(AuthenticationService);

  constructor() {
    this.auth.restoreFromStorage();
  }
}
