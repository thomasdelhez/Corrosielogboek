import { Routes } from '@angular/router';
import { HomePage } from './core/pages/home.page';
import { CORROSION_ROUTES } from './areas/corrosion/corrosion.routes';

export const routes: Routes = [
  { path: '', component: HomePage },
  ...CORROSION_ROUTES,
];
