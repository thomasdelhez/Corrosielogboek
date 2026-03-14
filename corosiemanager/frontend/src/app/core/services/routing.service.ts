import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  constructor(private readonly router: Router) {}

  goToCorrosionList(): Promise<boolean> {
    return this.router.navigate(['/corrosion']);
  }

  goToCorrosionDetail(holeId: number, workspace?: 'inspection' | 'repair'): Promise<boolean> {
    return this.router.navigate(['/corrosion', holeId], {
      queryParams: workspace ? { workspace } : undefined,
    });
  }
}
