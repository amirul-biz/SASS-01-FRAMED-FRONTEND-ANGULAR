import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionService } from '../../../pricing/selection.service';
import { EventsService } from '../../events.service';
import { IBundleVoucherSummary, IPricingBundle, PricingBundlesService } from '../../../pricing/pricing-bundles.service';
import { IVoucherCondition } from '../../../pricing/pricing.util';
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
  // whichever qualifying condition requires the fewest additional photos to unlock.
  readonly nextTierHint = computed(() => {
    const event = this.eventsService.getEvent(this.selection.eventId() ?? '');
    if (!event) {
      return null;
    }
    const bundles = event.pricingBundleIds
      .map((id) => this.pricingBundlesService.getBundle(id))
      .filter((b): b is IPricingBundle => !!b);

    const candidates = bundles.flatMap((bundle) =>
      bundle.vouchers.flatMap((voucher) => {
        const nextCondition = [...voucher.conditions]
          .sort((a, b) => a.minPhotos - b.minPhotos)
          .find((c) => this.selection.selectedCount() < c.minPhotos);
        return nextCondition ? [{ voucher, condition: nextCondition }] : [];
      }),
    );

    if (candidates.length === 0) {
      return null;
    }

    const nearest = candidates.reduce((best, cur) => (cur.condition.minPhotos < best.condition.minPhotos ? cur : best));
    return this.hintFor(nearest.voucher, nearest.condition);
  });

  private hintFor(voucher: IBundleVoucherSummary, condition: IVoucherCondition): string {
    return voucher.discountType === 'flat-tier'
      ? `Buy ${condition.minPhotos}+ for ${formatCurrency(condition.value / condition.minPhotos)}/photo`
      : `Buy ${condition.minPhotos}+ and get ${condition.value}% off each`;
  }

  viewCart(): void {
    this.router.navigate(['/cart']);
  }
}
