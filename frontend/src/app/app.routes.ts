import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Layout } from './layout/layout';
import { ClientListComponent } from './clients/client-list/client-list';
import { ClientDetailComponent } from './clients/client-detail/client-detail';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'clients', component: ClientListComponent },
      { path: 'clients/:id', component: ClientDetailComponent }
    ]
  }
];
