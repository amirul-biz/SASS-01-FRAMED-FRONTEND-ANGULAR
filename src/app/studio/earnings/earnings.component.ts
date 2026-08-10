import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EarningsComponent {
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly formatCurrency = formatCurrency;

  readonly events = computed(() => this.eventsService.getEventsByPhotographer(this.auth.demoPhotographerId));

  readonly rows = computed(() =>
    this.events().map((event) => {
      const basePrice = this.pricingBundlesService.getBundle(event.pricingBundleIds[0])?.basePrice ?? 0;
      return { event, basePrice, estimatedRevenue: event.photoCount * basePrice };
    }),
  );

  readonly totalRevenue = computed(() => this.rows().reduce((sum, r) => sum + r.estimatedRevenue, 0));
  readonly totalPhotos = computed(() => this.events().reduce((sum, e) => sum + e.photoCount, 0));
}
