import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { SelectionService } from '../../pricing/selection.service';
import { EventsService } from '../../events/events.service';
import { IPricingBundle, PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { IBundleTier, calculatePricing, qualifyingTiers as getQualifyingTiers } from '../../pricing/pricing.util';
import { formatCurrency } from '../../pricing/currency.util';

export interface VoucherOffer {
  bundle: IPricingBundle;
  tier: IBundleTier;
}

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummaryComponent {
  readonly selection = inject(SelectionService);
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly formatCurrency = formatCurrency;

  readonly bundles = computed(() => {
    const event = this.eventsService.getEvent(this.selection.eventId() ?? '');
    if (!event) {
      return [];
    }
    return event.pricingBundleIds
      .map((id) => this.pricingBundlesService.getBundle(id))
      .filter((bundle): bundle is IPricingBundle => !!bundle);
  });

  // Every qualifying tier across every voucher assigned to this event, flattened for the radio list.
  readonly voucherOffers = computed<VoucherOffer[]>(() =>
    this.bundles().flatMap((bundle) =>
      getQualifyingTiers(this.selection.selectedCount(), bundle).map((tier) => ({ bundle, tier })),
    ),
  );

  // The tier object references above come straight from each bundle's own `bundleTiers` array
  // (never re-wrapped), so this stays a stable reference across recomputation — required for
  // `selectedTier`'s linkedSignal "stays put once manually picked" behavior below to work.
  private readonly bestTier = computed<IBundleTier | null>(() => {
    const offers = this.voucherOffers();
    if (offers.length === 0) {
      return null;
    }
    const scored = offers.map((offer) => ({
      tier: offer.tier,
      total: calculatePricing(this.selection.photosTotal(), this.selection.selectedCount(), offer.bundle, offer.tier).total,
    }));
    return scored.reduce((best, cur) => (cur.total < best.total ? cur : best)).tier;
  });

  // Resets to the best qualifying tier (across all vouchers) whenever the qualifying set changes
  // (the rider adds/removes a photo), but stays put once the rider manually picks a different one.
  // null = the rider explicitly chose "No voucher applied".
  readonly selectedTier = linkedSignal<IBundleTier | null>(() => this.bestTier());

  readonly selectedBundle = computed(() => {
    const tier = this.selectedTier();
    const bundles = this.bundles();
    if (!tier) {
      return bundles[0];
    }
    return bundles.find((bundle) => bundle.bundleTiers.includes(tier)) ?? bundles[0];
  });

  readonly pricing = computed(() =>
    calculatePricing(this.selection.photosTotal(), this.selection.selectedCount(), this.selectedBundle(), this.selectedTier()),
  );

  chooseTier(tier: IBundleTier | null): void {
    this.selectedTier.set(tier);
  }

  tierPricePerPhoto(tier: IBundleTier | null): number {
    const bundle = tier ? (this.bundles().find((b) => b.bundleTiers.includes(tier)) ?? this.bundles()[0]) : this.bundles()[0];
    return calculatePricing(this.selection.photosTotal(), this.selection.selectedCount(), bundle, tier).pricePerPhoto;
  }
}
