import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { EventsService } from '../../events/events.service';
import { PricingBundlesService } from '../../pricing/pricing-bundles.service';
import { formatCurrency } from '../../pricing/currency.util';

@Component({
  selector: 'app-my-events-dashboard',
  imports: [RouterLink],
  templateUrl: './my-events-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyEventsDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly eventsService = inject(EventsService);
  private readonly pricingBundlesService = inject(PricingBundlesService);

  readonly formatCurrency = formatCurrency;

  private readonly allEvents = computed(() => this.eventsService.getEventsByPhotographer(this.auth.demoPhotographerId));

  readonly filterQuery = signal('');

  readonly events = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    if (!q) {
      return this.allEvents();
    }
    return this.allEvents().filter((e) => e.title.toLowerCase().includes(q));
  });

  readonly totalEvents = computed(() => this.allEvents().length);
  readonly totalPhotos = computed(() => this.allEvents().reduce((sum, e) => sum + e.photoCount, 0));
  readonly totalRevenue = computed(() =>
    this.allEvents().reduce(
      (sum, e) => sum + e.photoCount * (this.pricingBundlesService.getBundle(e.pricingBundleIds[0])?.basePrice ?? 0),
      0,
    ),
  );
  readonly publishedCount = computed(() => this.allEvents().filter((e) => e.status === 'published').length);

  onFilterChange(event: globalThis.Event): void {
    this.filterQuery.set((event.target as HTMLInputElement).value);
  }
}
