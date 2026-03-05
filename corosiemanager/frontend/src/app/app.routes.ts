import { Routes } from '@angular/router';
import { CORROSION_ROUTES } from './areas/corrosion/corrosion.routes';
import { HomePage } from './core/pages/home.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  ...CORROSION_ROUTES,
];
