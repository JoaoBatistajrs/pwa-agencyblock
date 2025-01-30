import { Routes } from '@angular/router';
import { CallerComponent } from './pages/caller/caller.component';

export const routes: Routes = [
  { path: '', redirectTo: '/caller', pathMatch: 'full' },
  { path: 'caller', component: CallerComponent  },
];
