import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionService } from '../../../pricing/selection.service';
import { EventsService } from '../../events.service';
import { PricingBundlesService } from '../../../pricing/pricing-bundles.service';
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

  readonly nextTierHint = computed(() => {
    const event = this.eventsService.getEvent(this.selection.eventId() ?? '');
    const bundle = event ? this.pricingBundlesService.getBundle(event.pricingBundleId) : undefined;
    if (!bundle || bundle.bundleModel === 'none') {
      return null;
    }
    const nextTier = [...bundle.bundleTiers]
      .sort((a, b) => a.minQuantity - b.minQuantity)
      .find((t) => this.selection.selectedCount() < t.minQuantity);
    if (!nextTier) {
      return null;
    }
    return bundle.bundleModel === 'flat-tier'
      ? `Buy ${nextTier.minQuantity}+ for ${formatCurrency(nextTier.value / nextTier.minQuantity)}/photo`
      : `Buy ${nextTier.minQuantity}+ and get ${nextTier.value}% off each`;
  });

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
