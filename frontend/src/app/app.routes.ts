import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./claims/claim-list/claim-list').then((m) => m.ClaimList),
  },
  {
    path: 'claims/:id',
    loadComponent: () =>
      import('./claims/claim-detail/claim-detail').then((m) => m.ClaimDetail),
  },
];
