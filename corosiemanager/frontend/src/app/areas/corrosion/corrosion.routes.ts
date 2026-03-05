import { Routes } from '@angular/router';
import { CorrosionDetailPage } from './pages/corrosion-detail.page';
import { CorrosionListPage } from './pages/corrosion-list.page';
import { MdrManagementPage } from './pages/mdr-management.page';
import { NdiReportsPage } from './pages/ndi-reports.page';

export const CORROSION_ROUTES: Routes = [
  { path: 'corrosion', component: CorrosionListPage },
  { path: 'corrosion/:id', component: CorrosionDetailPage },
  { path: 'mdr', component: MdrManagementPage },
  { path: 'ndi', component: NdiReportsPage },
];
