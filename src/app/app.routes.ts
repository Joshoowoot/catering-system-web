import { Routes } from '@angular/router';
import { Component } from '@angular/core';

// Empty placeholder component for root route
@Component({
selector: 'app-empty',
template: '',
standalone: true
})
class EmptyComponent {}

export const routes: Routes = [
{ path: '', pathMatch: 'full', component: EmptyComponent },
{ path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent) },
{ path: 'booking/thank-you', loadComponent: () => import('./booking/thank-you.component').then(m => m.ThankYouComponent) },
{ path: '**', component: EmptyComponent }
];
