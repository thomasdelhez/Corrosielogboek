import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoutingService {
  constructor(private readonly router: Router) {}

  goToCorrosionList(workspace?: 'inspection' | 'repair'): Promise<boolean> {
    return this.router.navigate(['/corrosion'], {
      queryParams: workspace ? { workspace } : undefined,
    });
  }

  goToCorrosionInspection(holeId: number): Promise<boolean> {
    return this.router.navigate(['/corrosion', holeId, 'inspection']);
  }

  goToCorrosionDetail(holeId: number, workspace?: 'repair' | 'parts'): Promise<boolean> {
    return this.router.navigate(['/corrosion', holeId], {
      queryParams: workspace ? { workspace } : undefined,
    });
  }
}
