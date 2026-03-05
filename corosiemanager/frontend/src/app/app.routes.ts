import { Routes } from '@angular/router';
import { CORROSION_ROUTES } from './areas/corrosion/corrosion.routes';
import { AircraftPanelsPage } from './core/pages/aircraft-panels.page';
import { HoleRepairsPage } from './core/pages/hole-repairs.page';
import { HomePage } from './core/pages/home.page';
import { MdrManagementPage } from './core/pages/mdr-management.page';
import { NdiReportsPage } from './core/pages/ndi-reports.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'menu/aircraft-panels', component: AircraftPanelsPage },
  { path: 'menu/hole-repairs', component: HoleRepairsPage },
  { path: 'menu/mdr-management', component: MdrManagementPage },
  { path: 'menu/ndi-reports', component: NdiReportsPage },
  ...CORROSION_ROUTES,
];
