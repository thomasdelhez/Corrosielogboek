import { Routes } from '@angular/router';
import { CORROSION_ROUTES } from './areas/corrosion/corrosion.routes';
import { HomePage } from './core/pages/home.page';
import { LoginPage } from './core/pages/login.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginPage },
  ...CORROSION_ROUTES,
];
