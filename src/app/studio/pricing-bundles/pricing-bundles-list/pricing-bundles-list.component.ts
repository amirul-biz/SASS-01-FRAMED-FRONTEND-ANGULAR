import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { PricingBundlesService } from '../../../pricing/pricing-bundles.service';
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

  readonly bundles = computed(() =>
    this.pricingBundlesService.getBundles(this.auth.demoPhotographerId).map((bundle) => ({
      bundle,
      eventCount: this.pricingBundlesService.eventCountUsingBundle(bundle.id),
    })),
  );

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
    this.pricingBundlesService.deleteBundle(id);
  }
}
