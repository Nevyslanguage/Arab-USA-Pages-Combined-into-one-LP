import { Routes } from '@angular/router';
// Routes configuration
import { ConfirmationPageComponent } from './confirmation-page/confirmation-page.component';
import { LeadFormComponent } from './lead-form/lead-form.component';

export const routes: Routes = [
  { path: '', component: LeadFormComponent },
  { path: 'confirmation', component: ConfirmationPageComponent },
  { path: '**', redirectTo: '' }
];
