import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CorrosionService } from '../services/corrosion.service';
import { Hole } from '../models/corrosion.models';

@Component({
  selector: 'app-corrosion-detail-page',
  template: `
    <main style="padding: 24px;">
      <h2>Hole detail</h2>

      @if (hole(); as h) {
        <p><strong>Hole #:</strong> {{ h.holeNumber }}</p>
        <p><strong>Status:</strong> {{ h.inspectionStatus ?? '-' }}</p>
        <p><strong>MDR:</strong> {{ h.mdrCode ?? '-' }}</p>
      } @else {
        <p>Laden...</p>
      }
    </main>
  `,
})
export class CorrosionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly corrosionService = inject(CorrosionService);

  protected readonly hole = signal<Hole | null>(null);

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const hole = await firstValueFrom(this.corrosionService.getHole(id));
    this.hole.set(hole);
  }
}
