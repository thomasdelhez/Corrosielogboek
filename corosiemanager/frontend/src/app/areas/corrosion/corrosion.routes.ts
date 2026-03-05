import { Routes } from '@angular/router';
import { CorrosionDetailPage } from './pages/corrosion-detail.page';
import { CorrosionListPage } from './pages/corrosion-list.page';

export const CORROSION_ROUTES: Routes = [
  { path: 'corrosion', component: CorrosionListPage },
  { path: 'corrosion/:id', component: CorrosionDetailPage },
];
