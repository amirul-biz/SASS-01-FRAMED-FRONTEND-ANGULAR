import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EventsService, EventStatus } from '../../events/events.service';
import { PhotographersService, PhotographerStatus } from '../../photographers/photographers.service';
import { PricingBundlesService, lowestOptionPrice } from '../../pricing/pricing-bundles.service';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-admin-dashboard-overview',
  templateUrl: './admin-dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardOverviewComponent {
  private readonly eventsService = inject(EventsService);
  private readonly photographersService = inject(PhotographersService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly formatCurrency = formatCurrency;

  readonly photographers = computed(() => this.photographersService.getPhotographers());
  readonly events = computed(() => this.eventsService.getEvents());

  readonly totalPhotographers = computed(() => this.photographers().length);
  readonly totalEvents = computed(() => this.events().length);
  readonly totalPhotos = computed(() => this.events().reduce((sum, e) => sum + e.photoCount, 0));
  readonly totalRevenue = computed(() =>
    this.events().reduce((sum, e) => {
      const bundle = this.pricingBundlesService.getBundle(e.pricingBundleIds[0]);
      return sum + e.photoCount * (bundle ? lowestOptionPrice(bundle) : 0);
    }, 0),
  );

  togglePhotographerStatus(id: string, current: PhotographerStatus): void {
    this.photographersService.setStatus(id, current === 'active' ? 'suspended' : 'active');
  }

  toggleEventFlag(id: string, current: EventStatus): void {
    this.eventsService.setEventStatus(id, current === 'flagged' ? 'published' : 'flagged');
  }
}
