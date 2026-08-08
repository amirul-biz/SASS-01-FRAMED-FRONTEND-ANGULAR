import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PhotographersService } from '../../photographers/photographers.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';

@Component({
  selector: 'app-create-event',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(EventsService);
  private readonly photographersService = inject(PhotographersService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly availableBundles = this.pricingBundlesService.getBundles(this.auth.demoPhotographerId);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['', Validators.required],
    location: ['', Validators.required],
    dateRange: ['', Validators.required],
    pricingBundleId: ['', Validators.required],
  });

  create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const photographerId = this.auth.demoPhotographerId;
    const photographerName = this.photographersService.getPhotographer(photographerId)?.name ?? 'Unknown';
    this.eventsService.createEvent({ ...this.form.getRawValue(), photographerId, photographerName });

    this.router.navigate(['/studio/events']);
  }
}
