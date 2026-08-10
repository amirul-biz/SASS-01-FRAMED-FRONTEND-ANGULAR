import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionService } from '../../../pricing/selection.service';
import { EventsService } from '../../events.service';
import { IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { IBundleTier } from '../../../pricing/pricing.util';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-selection-bar',
  templateUrl: './selection-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionBarComponent {
  readonly selection = inject(SelectionService);
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);
  private readonly router = inject(Router);

  readonly formatCurrency = formatCurrency;

  // The nearest upcoming voucher milestone across every voucher assigned to this event —
  // whichever qualifying tier requires the fewest additional photos to unlock.
  readonly nextTierHint = computed(() => {
    const event = this.eventsService.getEvent(this.selection.eventId() ?? '');
    if (!event) {
      return null;
    }
    const bundles = event.pricingBundleIds
      .map((id) => this.pricingBundlesService.getBundle(id))
      .filter((b): b is IPricingBundle => !!b);

    const candidates = bundles.flatMap((bundle) => {
      if (bundle.bundleModel === 'none') {
        return [];
      }
      const nextTier = [...bundle.bundleTiers]
        .sort((a, b) => a.minQuantity - b.minQuantity)
        .find((t) => this.selection.selectedCount() < t.minQuantity);
      return nextTier ? [{ bundle, tier: nextTier }] : [];
    });

    if (candidates.length === 0) {
      return null;
    }

    const nearest = candidates.reduce((best, cur) => (cur.tier.minQuantity < best.tier.minQuantity ? cur : best));
    return this.hintFor(nearest.bundle, nearest.tier);
  });

  private hintFor(bundle: IPricingBundle, tier: IBundleTier): string {
    return bundle.bundleModel === 'flat-tier'
      ? `Buy ${tier.minQuantity}+ for ${formatCurrency(tier.value / tier.minQuantity)}/photo`
      : `Buy ${tier.minQuantity}+ and get ${tier.value}% off each`;
  }

  viewCart(): void {
    this.router.navigate(['/cart']);
  }
}
