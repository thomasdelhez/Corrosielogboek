import { Routes } from '@angular/router';
import { requireAdminGuard, requireLoginGuard, requireReviewerGuard } from '../../core/security/guards/auth.guards';
import { AdminMasterDataPage } from './pages/admin-master-data.page';
import { AdminUsersPage } from './pages/admin-users.page';
import { CorrosionInspectionPage } from './pages/corrosion-inspection.page';
import { CorrosionListPage } from './pages/corrosion-list.page';
import { CorrosionRepairPage } from './pages/corrosion-repair.page';
import { CorrosionReportPage } from './pages/corrosion-report.page';
import { HoleTrackersPage } from './pages/hole-trackers.page';
import { InspectionQueuesPage } from './pages/inspection-queues.page';
import { InstallationTrackersPage } from './pages/installation-trackers.page';
import { MdrManagementPage } from './pages/mdr-management.page';
import { NdiReportsPage } from './pages/ndi-reports.page';
import { OrderingTrackerPage } from './pages/ordering-tracker.page';

export const CORROSION_ROUTES: Routes = [
  { path: 'corrosion', component: CorrosionListPage, canActivate: [requireLoginGuard] },
  { path: 'corrosion/:id/inspection', component: CorrosionInspectionPage, canActivate: [requireLoginGuard] },
  { path: 'corrosion/:id/repair', component: CorrosionRepairPage, canActivate: [requireLoginGuard] },
  { path: 'corrosion/:id', component: CorrosionRepairPage, canActivate: [requireLoginGuard] },
  { path: 'mdr', component: MdrManagementPage, canActivate: [requireLoginGuard, requireReviewerGuard] },
  { path: 'ndi', component: NdiReportsPage, canActivate: [requireLoginGuard, requireReviewerGuard] },
  { path: 'ordering', component: OrderingTrackerPage, canActivate: [requireLoginGuard] },
  { path: 'inspection', component: InspectionQueuesPage, canActivate: [requireLoginGuard] },
  { path: 'trackers', component: HoleTrackersPage, canActivate: [requireLoginGuard] },
  { path: 'installation', component: InstallationTrackersPage, canActivate: [requireLoginGuard] },
  { path: 'admin/aircraft-beheer', component: AdminMasterDataPage, canActivate: [requireLoginGuard] },
  { path: 'admin/users', component: AdminUsersPage, canActivate: [requireLoginGuard, requireAdminGuard] },
  { path: 'reports/corrosion-tracker', component: CorrosionReportPage, canActivate: [requireLoginGuard] },
];
