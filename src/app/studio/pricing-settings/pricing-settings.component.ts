import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
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
  private readonly router = inject(Router);

  id = input.required<string>();

  readonly formatCurrency = formatCurrency;
  readonly event = computed(() => this.eventsService.getEvent(this.id()));
  readonly availableBundles = computed(() => this.pricingBundlesService.getBundles(this.auth.demoPhotographerId));

  // Resets whenever `id` changes (new event navigated to), but not on unrelated data mutations
  // elsewhere in the app — the event lookup itself is read untracked for that reason.
  readonly selectedBundleId = linkedSignal<string | undefined>(() => {
    this.id();
    return untracked(() => this.event())?.pricingBundleId;
  });

  readonly selectedBundle = computed(() => this.pricingBundlesService.getBundle(this.selectedBundleId() ?? ''));

  readonly previewTiers = computed(() => {
    const bundle = this.selectedBundle();
    if (!bundle) {
      return [];
    }
    return bundle.bundleTiers.map((tier) => ({
      tier,
      preview: calculatePricing(tier.minQuantity, bundle),
    }));
  });

  selectBundle(bundleId: string): void {
    this.selectedBundleId.set(bundleId);
  }

  save(): void {
    const bundleId = this.selectedBundleId();
    if (!bundleId) {
      return;
    }
    this.eventsService.assignPricingBundle(this.id(), bundleId);
    this.router.navigate(['/studio/events']);
  }
}
