import { Routes } from '@angular/router';
import { CORROSION_ROUTES } from './areas/corrosion/corrosion.routes';
import { AccountPage } from './core/pages/account.page';
import { HomePage } from './core/pages/home.page';
import { LoginPage } from './core/pages/login.page';
import { requireLoginGuard } from './core/security/guards/auth.guards';

export const routes: Routes = [
  { path: '', component: HomePage, canActivate: [requireLoginGuard] },
  { path: 'account', component: AccountPage, canActivate: [requireLoginGuard] },
  { path: 'login', component: LoginPage },
  ...CORROSION_ROUTES,
];
