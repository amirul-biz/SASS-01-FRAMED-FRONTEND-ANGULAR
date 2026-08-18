import { Routes } from '@angular/router';
import { ConsumerShellComponent } from './layout/consumer-shell/consumer-shell.component';
import { StudioShellComponent } from './layout/studio-shell/studio-shell.component';
import { AdminShellComponent } from './layout/admin-shell/admin-shell.component';
import { studioGuard } from './auth/studio.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: ConsumerShellComponent,
    children: [
      { path: '', loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent) },
      {
        path: 'events',
        loadComponent: () => import('./events/events-list/events-list.component').then((m) => m.EventsListComponent),
      },
      {
        path: 'events/:id',
        loadComponent: () => import('./events/event-detail/event-detail.component').then((m) => m.EventDetailComponent),
      },
      {
        path: 'photographers',
        loadComponent: () =>
          import('./photographers/photographers-list/photographers-list.component').then((m) => m.PhotographersListComponent),
      },
      {
        path: 'photographers/:id',
        loadComponent: () =>
          import('./photographers/photographer-profile/photographer-profile.component').then((m) => m.PhotographerProfileComponent),
      },
      {
        path: 'cart',
        loadComponent: () => import('./checkout/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./checkout/checkout.component').then((m) => m.CheckoutComponent),
      },
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
      },
    ],
  },
  {
    path: 'studio',
    component: StudioShellComponent,
    canActivate: [studioGuard],
    children: [
      { path: '', redirectTo: 'events', pathMatch: 'full' },
      {
        path: 'events',
        loadComponent: () =>
          import('./studio/my-events/my-events-dashboard.component').then((m) => m.MyEventsDashboardComponent),
      },
      {
        path: 'events/new',
        loadComponent: () => import('./studio/create-event/create-event.component').then((m) => m.CreateEventComponent),
      },
      {
        path: 'events/:id/edit',
        loadComponent: () => import('./studio/create-event/create-event.component').then((m) => m.CreateEventComponent),
      },
      {
        path: 'events/:id/upload',
        loadComponent: () =>
          import('./studio/upload-photos/upload-photos.component').then((m) => m.UploadPhotosComponent),
      },
      {
        path: 'events/:id/pricing',
        loadComponent: () =>
          import('./studio/pricing-settings/pricing-settings.component').then((m) => m.PricingSettingsComponent),
      },
      {
        path: 'pricing-bundles',
        loadComponent: () =>
          import('./studio/pricing-bundles/pricing-bundles-list/pricing-bundles-list.component').then(
            (m) => m.PricingBundlesListComponent,
          ),
      },
      {
        path: 'pricing-bundles/new',
        loadComponent: () =>
          import('./studio/pricing-bundles/pricing-bundle-form/pricing-bundle-form.component').then(
            (m) => m.PricingBundleFormComponent,
          ),
      },
      {
        path: 'pricing-bundles/:id/edit',
        loadComponent: () =>
          import('./studio/pricing-bundles/pricing-bundle-form/pricing-bundle-form.component').then(
            (m) => m.PricingBundleFormComponent,
          ),
      },
      {
        path: 'pricing-options',
        loadComponent: () =>
          import('./studio/pricing-options/pricing-options-list/pricing-options-list.component').then(
            (m) => m.PricingOptionsListComponent,
          ),
      },
      {
        path: 'pricing-options/new',
        loadComponent: () =>
          import('./studio/pricing-options/pricing-option-form/pricing-option-form.component').then(
            (m) => m.PricingOptionFormComponent,
          ),
      },
      {
        path: 'pricing-options/:id/edit',
        loadComponent: () =>
          import('./studio/pricing-options/pricing-option-form/pricing-option-form.component').then(
            (m) => m.PricingOptionFormComponent,
          ),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('./studio/vouchers/vouchers-list/vouchers-list.component').then((m) => m.VouchersListComponent),
      },
      {
        path: 'vouchers/new',
        loadComponent: () =>
          import('./studio/vouchers/voucher-form/voucher-form.component').then((m) => m.VoucherFormComponent),
      },
      {
        path: 'vouchers/:id/edit',
        loadComponent: () =>
          import('./studio/vouchers/voucher-form/voucher-form.component').then((m) => m.VoucherFormComponent),
      },
      {
        path: 'earnings',
        loadComponent: () => import('./studio/earnings/earnings.component').then((m) => m.EarningsComponent),
      },
      {
        path: 'profile-settings',
        loadComponent: () =>
          import('./studio/profile-settings/profile-settings.component').then((m) => m.ProfileSettingsComponent),
      },
    ],
  },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./admin/dashboard-overview/admin-dashboard-overview.component').then((m) => m.AdminDashboardOverviewComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
