import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { SelectionService } from '../../pricing/selection.service';
import { EventsService } from '../../events/events.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { IBundleTier, calculatePricing, qualifyingTiers as getQualifyingTiers } from '../../pricing/pricing.util';
import { formatCurrency } from '../../pricing/currency.util';

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

  readonly bundle = computed(() => {
    const event = this.eventsService.getEvent(this.selection.eventId() ?? '');
    return event ? this.pricingBundlesService.getBundle(event.pricingBundleId) : undefined;
  });

  readonly basePrice = computed(() => this.bundle()?.basePrice ?? 0);

  readonly qualifyingTiers = computed(() => getQualifyingTiers(this.selection.selectedCount(), this.bundle()));

  // Resets to the best (last, ascending-sorted) qualifying tier whenever the qualifying set changes
  // (the rider adds/removes a photo), but stays put once the rider manually picks a different one.
  // null = the rider explicitly chose "No coupon applied".
  readonly selectedTier = linkedSignal<IBundleTier | null>(() => this.qualifyingTiers().at(-1) ?? null);

  readonly pricing = computed(() => calculatePricing(this.selection.selectedCount(), this.bundle(), this.selectedTier()));

  readonly grandTotal = computed(() => this.pricing().total + this.selection.formatExtrasTotal());

  chooseTier(tier: IBundleTier | null): void {
    this.selectedTier.set(tier);
  }

  tierPricePerPhoto(tier: IBundleTier | null): number {
    return calculatePricing(this.selection.selectedCount(), this.bundle(), tier).pricePerPhoto;
  }
}
