import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  constructor(private readonly router: Router) {}

  goToCorrosionList(): Promise<boolean> {
    return this.router.navigate(['/corrosion']);
  }

  goToCorrosionDetail(holeId: number): Promise<boolean> {
    return this.router.navigate(['/corrosion', holeId]);
  }
}
