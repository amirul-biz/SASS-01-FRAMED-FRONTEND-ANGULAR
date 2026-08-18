import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-pricing-bundles-list',
  imports: [RouterLink],
  templateUrl: './pricing-bundles-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingBundlesListComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly formatCurrency = formatCurrency;
  private readonly rawBundles = signal<IPricingBundle[]>([]);

  readonly bundles = computed(() =>
    this.rawBundles().map((bundle) => ({ bundle, eventCount: bundle.eventsUsingCount })),
  );

  constructor() {
    this.reload();
  }

  ruleSummary(bundle: { bundleModel: string; bundleTiers: { minQuantity: number; value: number }[] }): string {
    if (bundle.bundleModel === 'none' || bundle.bundleTiers.length === 0) {
      return 'Per-photo pricing only';
    }
    const [tier] = bundle.bundleTiers;
    return bundle.bundleModel === 'flat-tier'
      ? `${tier.minQuantity}+ photos for RM${tier.value} flat`
      : `${tier.minQuantity}+ photos, ${tier.value}% off each`;
  }

  deleteBundle(id: string): void {
    this.pricingBundlesService
      .deleteBundle(id)
      .then(() => this.reload())
      .catch(() => {
        alert('Could not delete this bundle — it may still be in use by an event.');
        this.reload();
      });
  }

  private reload(): void {
    this.pricingBundlesService.getBundles(this.auth.photographerId()!).then((bundles) => this.rawBundles.set(bundles));
  }
}
