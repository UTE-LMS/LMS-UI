import { Routes } from '@angular/router';

export const auditLogsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-audit-logs/list-audit-logs.component').then(m => m.ListAuditLogsComponent),
  },
];
