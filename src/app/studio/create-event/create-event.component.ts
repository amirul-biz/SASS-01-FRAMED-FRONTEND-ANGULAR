import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PhotographersService } from '../../photographers/photographers.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { PricingOptionsService } from '../../pricing/pricing-options.service';

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
  private readonly pricingOptionsService = inject(PricingOptionsService);

  readonly availableBundles = this.pricingBundlesService.getBundles(this.auth.demoPhotographerId);
  readonly availableOptions = this.pricingOptionsService.getOptions(this.auth.demoPhotographerId);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['', Validators.required],
    location: ['', Validators.required],
    dateRange: ['', Validators.required],
  });

  readonly selectedBundleIds = signal<Set<string>>(new Set());
  readonly selectedOptionIds = signal<Set<string>>(new Set());
  readonly submitted = signal(false);

  isBundleChecked(id: string): boolean {
    return this.selectedBundleIds().has(id);
  }

  toggleBundle(id: string): void {
    const next = new Set(this.selectedBundleIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedBundleIds.set(next);
  }

  isOptionChecked(id: string): boolean {
    return this.selectedOptionIds().has(id);
  }

  toggleOption(id: string): void {
    const next = new Set(this.selectedOptionIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedOptionIds.set(next);
  }

  create(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.selectedBundleIds().size === 0 || this.selectedOptionIds().size === 0) {
      return;
    }

    const photographerId = this.auth.demoPhotographerId;
    const photographerName = this.photographersService.getPhotographer(photographerId)?.name ?? 'Unknown';
    this.eventsService.createEvent({
      ...this.form.getRawValue(),
      photographerId,
      photographerName,
      pricingBundleIds: Array.from(this.selectedBundleIds()),
      pricingOptionIds: Array.from(this.selectedOptionIds()),
    });

    this.router.navigate(['/studio/events']);
  }
}
