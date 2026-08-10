import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { PricingOptionsService } from '../../pricing/pricing-options.service';
import { calculatePricing } from '../../pricing/pricing.util';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-pricing-settings',
  imports: [RouterLink],
  templateUrl: './pricing-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingSettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly pricingOptionsService = inject(PricingOptionsService);
  private readonly router = inject(Router);

  id = input.required<string>();

  readonly formatCurrency = formatCurrency;
  readonly event = computed(() => this.eventsService.getEvent(this.id()));
  readonly availableBundles = computed(() => this.pricingBundlesService.getBundles(this.auth.demoPhotographerId));
  readonly availableOptions = computed(() => this.pricingOptionsService.getOptions(this.auth.demoPhotographerId));

  // Reset whenever `id` changes (new event navigated to), but not on unrelated data mutations
  // elsewhere in the app — the event lookup itself is read untracked for that reason.
  readonly selectedBundleIds = linkedSignal<Set<string>>(() => {
    this.id();
    return new Set(untracked(() => this.event())?.pricingBundleIds ?? []);
  });

  readonly selectedOptionIds = linkedSignal<Set<string>>(() => {
    this.id();
    return new Set(untracked(() => this.event())?.pricingOptionIds ?? []);
  });

  readonly selectedBundles = computed(() => this.availableBundles().filter((b) => this.selectedBundleIds().has(b.id)));

  readonly previewByBundle = computed(() =>
    this.selectedBundles().map((bundle) => ({
      bundle,
      tiers: bundle.bundleTiers.map((tier) => ({
        tier,
        preview: calculatePricing(tier.minQuantity * bundle.basePrice, tier.minQuantity, bundle),
      })),
    })),
  );

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

  save(): void {
    if (this.selectedBundleIds().size === 0) {
      return;
    }
    this.eventsService.assignPricingBundles(this.id(), Array.from(this.selectedBundleIds()));
    this.eventsService.assignPricingOptions(this.id(), Array.from(this.selectedOptionIds()));
    this.router.navigate(['/studio/events']);
  }
}
